"""
FinSmart Pro – Combined Major Project
SmartLoan AI (ML Loan Prediction) + FinCalc Pro (25 Financial Calculators)
Flask Backend | SQLite | CatBoost/XGBoost/RandomForest | Python 3.11+
"""

import os, json, csv, io, datetime, secrets
from functools import wraps

import warnings
import numpy as np
import pandas as pd
import joblib
from flask import (Flask, render_template, request, jsonify, redirect,
                   url_for, session, send_file, flash)
from flask_sqlalchemy import SQLAlchemy
from sklearn.exceptions import InconsistentVersionWarning
from werkzeug.security import generate_password_hash, check_password_hash

# ── App Setup ────────────────────────────────────────────────────────────────
app = Flask(__name__)
app.secret_key = secrets.token_hex(32)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///smartloan.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# ── Load ML Artifacts ────────────────────────────────────────────────────────
MODEL_DIR     = 'models'
with warnings.catch_warnings():
    warnings.filterwarnings('ignore', category=InconsistentVersionWarning)
    model         = joblib.load(os.path.join(MODEL_DIR, 'best_model.pkl'))
    scaler        = joblib.load(os.path.join(MODEL_DIR, 'scaler.pkl'))
    imputer       = joblib.load(os.path.join(MODEL_DIR, 'imputer.pkl'))
    feature_names = joblib.load(os.path.join(MODEL_DIR, 'feature_names.pkl'))
    top_features  = joblib.load(os.path.join(MODEL_DIR, 'top_features.pkl'))

with open(os.path.join(MODEL_DIR, 'model_meta.json')) as f:
    model_meta = json.load(f)

# Encoding maps (int ← user string)
HOME_OWNERSHIP_STR2INT = {'MORTGAGE': 0, 'OTHER': 1, 'OWN': 2, 'RENT': 3}
LOAN_INTENT_STR2INT    = {'DEBTCONSOLIDATION': 0, 'EDUCATION': 1, 'HOMEIMPROVEMENT': 2,
                           'MEDICAL': 3, 'PERSONAL': 4, 'VENTURE': 5}
LOAN_GRADE_STR2INT     = {'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6}
DEFAULT_STR2INT        = {'N': 0, 'Y': 1}

# ── DB Models ────────────────────────────────────────────────────────────────
class User(db.Model):
    id           = db.Column(db.Integer, primary_key=True)
    username     = db.Column(db.String(80), unique=True, nullable=False)
    email        = db.Column(db.String(120), unique=True, nullable=False)
    password     = db.Column(db.String(200), nullable=False)
    role         = db.Column(db.String(20), default='user')
    created_at   = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    predictions  = db.relationship('Prediction', backref='user', lazy=True)

class Prediction(db.Model):
    id                         = db.Column(db.Integer, primary_key=True)
    user_id                    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    person_age                 = db.Column(db.Float)
    person_income              = db.Column(db.Float)
    person_home_ownership      = db.Column(db.String(20))
    person_emp_length          = db.Column(db.Float)
    loan_intent                = db.Column(db.String(30))
    loan_grade                 = db.Column(db.String(5))
    loan_amnt                  = db.Column(db.Float)
    loan_int_rate              = db.Column(db.Float)
    loan_percent_income        = db.Column(db.Float)
    cb_person_default_on_file  = db.Column(db.String(5))
    cb_person_cred_hist_length = db.Column(db.Float)
    result                     = db.Column(db.String(20))
    risk_pct                   = db.Column(db.Float)
    confidence                 = db.Column(db.Float)
    recommendation             = db.Column(db.Text)
    created_at                 = db.Column(db.DateTime, default=datetime.datetime.utcnow)

# ── Auth Decorators ───────────────────────────────────────────────────────────
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        u = db.session.get(User, session['user_id'])
        if not u or u.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated

# ── Prediction Helper ────────────────────────────────────────────────────────
def make_prediction(data: dict):
    """
    Accepts form data with string labels for categorical fields.
    Encodes them to integers, imputes, scales, predicts.
    """
    row = {
        'person_age':                 float(data.get('person_age', 25)),
        'person_income':              float(data.get('person_income', 300000)),
        'person_home_ownership':      float(HOME_OWNERSHIP_STR2INT.get(
                                          data.get('person_home_ownership', 'RENT'), 3)),
        'person_emp_length':          float(data.get('person_emp_length', 2)),
        'loan_intent':                float(LOAN_INTENT_STR2INT.get(
                                          data.get('loan_intent', 'PERSONAL'), 4)),
        'loan_grade':                 float(LOAN_GRADE_STR2INT.get(
                                          data.get('loan_grade', 'C'), 2)),
        'loan_amnt':                  float(data.get('loan_amnt', 50000)),
        'loan_int_rate':              float(data.get('loan_int_rate', 12.0)),
        'loan_percent_income':        float(data.get('loan_percent_income', 0.0)),
        'cb_person_default_on_file':  float(DEFAULT_STR2INT.get(
                                          data.get('cb_person_default_on_file', 'N'), 0)),
        'cb_person_cred_hist_length': float(data.get('cb_person_cred_hist_length', 3)),
    }

    # Auto-compute loan_percent_income if not provided / zero
    if row['loan_percent_income'] == 0.0 and row['person_income'] > 0:
        row['loan_percent_income'] = round(row['loan_amnt'] / row['person_income'], 4)

    df_row  = pd.DataFrame([row], columns=feature_names)
    df_imp  = pd.DataFrame(imputer.transform(df_row), columns=feature_names)
    df_sc   = pd.DataFrame(scaler.transform(df_imp), columns=feature_names)
    df_sel  = df_sc[top_features]

    # Model trained with 1=APPROVED (non-default), 0=REJECTED (default)
    proba         = model.predict_proba(df_sel)[0]
    prob_approved = float(proba[1])   # P(APPROVED)
    prob_rejected = float(proba[0])   # P(REJECTED)
    result  = 'APPROVED' if prob_approved >= 0.5 else 'REJECTED'
    risk    = round(prob_rejected * 100, 2)
    conf    = round(max(prob_approved, prob_rejected) * 100, 2)

    # AI Recommendation
    grade   = data.get('loan_grade', 'C')
    default = data.get('cb_person_default_on_file', 'N')
    lpi     = row['loan_percent_income']
    int_r   = row['loan_int_rate']
    rec = []
    if result == 'APPROVED':
        rec.append('Loan application looks strong.')
        if grade in ('A', 'B'):  rec.append('Excellent loan grade improves your profile.')
        if lpi < 0.3:            rec.append('Healthy loan-to-income ratio.')
        if int_r < 12:           rec.append('Competitive interest rate supports approval.')
    else:
        rec.append('Application needs improvement.')
        if grade in ('E', 'F', 'G'): rec.append('Loan grade is low - work on credit history.')
        if lpi > 0.4:                rec.append('Consider reducing loan amount relative to income.')
        if default == 'Y':           rec.append('Prior defaults on file hurt your score. Address them first.')
        if int_r > 18:               rec.append('High interest rate signals elevated risk.')

    rec_plain   = ' '.join(rec)
    rec_display = ('✅ ' if result == 'APPROVED' else '❌ ') + rec_plain

    return {
        'result':               result,
        'risk_pct':             risk,
        'confidence':           conf,
        'recommendation':       rec_display,
        'recommendation_plain': rec_plain,
        'prob_approved':        round(prob_approved * 100, 2),
        'prob_rejected':        round(prob_rejected * 100, 2),
    }

# ── Routes – Pages ───────────────────────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/calculators')
def calculators():
    """FinCalc Pro – 25 Financial Calculators (no auth required)"""
    return render_template('calculators.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        data     = request.get_json() or request.form
        username = data.get('username', '').strip()
        email    = data.get('email', '').strip()
        password = data.get('password', '')
        if User.query.filter_by(username=username).first():
            return jsonify({'success': False, 'message': 'Username already exists'}), 400
        if User.query.filter_by(email=email).first():
            return jsonify({'success': False, 'message': 'Email already registered'}), 400
        hashed = generate_password_hash(password)
        role   = 'admin' if User.query.count() == 0 else 'user'
        u      = User(username=username, email=email, password=hashed, role=role)
        db.session.add(u); db.session.commit()
        session['user_id']  = u.id
        session['username'] = u.username
        session['role']     = u.role
        return jsonify({'success': True, 'message': 'Registered successfully', 'role': u.role})
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data     = request.get_json() or request.form
        username = data.get('username', '').strip()
        password = data.get('password', '')
        u        = User.query.filter_by(username=username).first()
        if u and check_password_hash(u.password, password):
            session['user_id']  = u.id
            session['username'] = u.username
            session['role']     = u.role
            return jsonify({'success': True, 'message': 'Login successful', 'role': u.role})
        return jsonify({'success': False, 'message': 'Invalid credentials'}), 401
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

@app.route('/dashboard')
@login_required
def dashboard():
    u     = db.session.get(User, session['user_id'])
    preds = Prediction.query.filter_by(user_id=u.id)\
                .order_by(Prediction.created_at.desc()).limit(10).all()
    return render_template('dashboard.html', user=u, predictions=preds, meta=model_meta)

@app.route('/predict-page')
@login_required
def predict_page():
    return render_template('predict.html')

@app.route('/history')
@login_required
def history():
    u     = db.session.get(User, session['user_id'])
    preds = Prediction.query.filter_by(user_id=u.id)\
                .order_by(Prediction.created_at.desc()).all()
    return render_template('history.html', predictions=preds)


@app.route('/loan-contacts')
@login_required
def loan_contacts():
    """Render the loan contacts page (linked from base template)."""
    return render_template('loan_contacts.html')

@app.route('/admin')
@admin_required
def admin_panel():
    users     = User.query.all()
    all_preds = Prediction.query.order_by(Prediction.created_at.desc()).all()
    total     = len(all_preds)
    approved  = sum(1 for p in all_preds if p.result == 'APPROVED')
    return render_template('admin.html', users=users, predictions=all_preds,
                           total=total, approved=approved,
                           rejected=total-approved, meta=model_meta)

# ── Routes – API ──────────────────────────────────────────────────────────────
@app.route('/api/predict', methods=['POST'])
@login_required
def api_predict():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    try:
        res = make_prediction(data)
        lpi = float(data.get('loan_percent_income') or 0)
        if lpi == 0 and float(data.get('person_income', 1)) > 0:
            lpi = round(float(data.get('loan_amnt', 0)) / float(data.get('person_income', 1)), 4)

        p = Prediction(
            user_id                    = session['user_id'],
            person_age                 = float(data.get('person_age', 0)),
            person_income              = float(data.get('person_income', 0)),
            person_home_ownership      = data.get('person_home_ownership', ''),
            person_emp_length          = float(data.get('person_emp_length', 0)),
            loan_intent                = data.get('loan_intent', ''),
            loan_grade                 = data.get('loan_grade', ''),
            loan_amnt                  = float(data.get('loan_amnt', 0)),
            loan_int_rate              = float(data.get('loan_int_rate', 0)),
            loan_percent_income        = lpi,
            cb_person_default_on_file  = data.get('cb_person_default_on_file', 'N'),
            cb_person_cred_hist_length = float(data.get('cb_person_cred_hist_length', 0)),
            result                     = res['result'],
            risk_pct                   = res['risk_pct'],
            confidence                 = res['confidence'],
            recommendation             = res['recommendation_plain'],
        )
        db.session.add(p); db.session.commit()
        res['prediction_id'] = p.id
        return jsonify(res)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/history')
@login_required
def api_history():
    preds = Prediction.query.filter_by(user_id=session['user_id'])\
                .order_by(Prediction.created_at.desc()).all()
    return jsonify([{
        'id':          p.id,
        'result':      p.result,
        'risk_pct':    p.risk_pct,
        'confidence':  p.confidence,
        'loan_amnt':   p.loan_amnt,
        'loan_grade':  p.loan_grade,
        'created_at':  p.created_at.strftime('%Y-%m-%d %H:%M'),
    } for p in preds])

@app.route('/api/model-metrics')
@login_required
def api_model_metrics():
    return jsonify(model_meta)

@app.route('/api/export-csv')
@login_required
def export_csv():
    preds = Prediction.query.filter_by(user_id=session['user_id'])\
                .order_by(Prediction.created_at.desc()).all()
    si = io.StringIO()
    writer = csv.writer(si)
    writer.writerow(['ID', 'Age', 'Income', 'Home', 'Emp Length',
                     'Intent', 'Grade', 'Loan Amt', 'Int Rate',
                     'Loan%Inc', 'Default on File', 'Cred Hist Len',
                     'Result', 'Risk%', 'Confidence', 'Date'])
    for p in preds:
        writer.writerow([p.id, p.person_age, p.person_income,
                         p.person_home_ownership, p.person_emp_length,
                         p.loan_intent, p.loan_grade, p.loan_amnt,
                         p.loan_int_rate, p.loan_percent_income,
                         p.cb_person_default_on_file, p.cb_person_cred_hist_length,
                         p.result, p.risk_pct, p.confidence,
                         p.created_at.strftime('%Y-%m-%d %H:%M')])
    output = io.BytesIO()
    output.write(si.getvalue().encode('utf-8'))
    output.seek(0)
    return send_file(output, mimetype='text/csv',
                     as_attachment=True, download_name='loan_predictions.csv')

@app.route('/api/export-pdf/<int:pred_id>')
@login_required
def export_pdf(pred_id):
    from fpdf import FPDF
    p = Prediction.query.get_or_404(pred_id)
    if p.user_id != session['user_id'] and session.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    pdf = FPDF()
    pdf.add_page()
    pdf.set_font('Helvetica', 'B', 20)
    pdf.set_fill_color(15, 23, 42)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 15, 'SmartLoan AI - Prediction Report', fill=True, ln=True, align='C')
    pdf.ln(5)
    pdf.set_text_color(0, 0, 0)
    pdf.set_font('Helvetica', '', 11)
    pdf.cell(0, 8, f'Date: {p.created_at.strftime("%Y-%m-%d %H:%M")}', ln=True)
    pdf.cell(0, 8, f'Prediction ID: #{p.id}', ln=True)
    pdf.ln(4)

    pdf.set_font('Helvetica', 'B', 13)
    color = (34, 197, 94) if p.result == 'APPROVED' else (239, 68, 68)
    pdf.set_fill_color(*color)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 12, f'  Decision: {p.result}', fill=True, ln=True)
    pdf.set_text_color(0, 0, 0)
    pdf.ln(4)

    pdf.set_font('Helvetica', 'B', 12)
    pdf.cell(0, 8, 'Applicant Details', ln=True)
    pdf.set_font('Helvetica', '', 11)
    rows = [
        ('Age',                   p.person_age),
        ('Annual Income',         f'Rs. {p.person_income:,.0f}'),
        ('Home Ownership',        p.person_home_ownership),
        ('Employment Length',     f'{p.person_emp_length} yrs'),
        ('Loan Intent',           p.loan_intent),
        ('Loan Grade',            p.loan_grade),
        ('Loan Amount',           f'Rs. {p.loan_amnt:,.0f}'),
        ('Interest Rate',         f'{p.loan_int_rate}%'),
        ('Loan % of Income',      f'{p.loan_percent_income:.2%}'),
        ('Prior Default on File', p.cb_person_default_on_file),
        ('Credit History Length', f'{p.cb_person_cred_hist_length} yrs'),
    ]
    for label, val in rows:
        pdf.set_fill_color(245, 245, 245)
        pdf.cell(75, 8, label, border=1, fill=True)
        pdf.cell(0,  8, str(val), border=1, ln=True)
    pdf.ln(4)

    pdf.set_font('Helvetica', 'B', 12)
    pdf.cell(0, 8, 'Risk Assessment', ln=True)
    pdf.set_font('Helvetica', '', 11)
    pdf.cell(0, 8, f'Risk Score:  {p.risk_pct}%', ln=True)
    pdf.cell(0, 8, f'Confidence:  {p.confidence}%', ln=True)
    pdf.ln(3)
    pdf.set_font('Helvetica', 'B', 12)
    pdf.cell(0, 8, 'AI Recommendation', ln=True)
    pdf.set_font('Helvetica', '', 10)
    pdf.multi_cell(0, 7, p.recommendation or '')
    pdf.ln(6)
    pdf.set_font('Helvetica', 'I', 9)
    pdf.set_text_color(128, 128, 128)
    pdf.cell(0, 6, 'Generated by SmartLoan AI - For informational purposes only.', ln=True, align='C')

    buf = io.BytesIO()
    pdf_bytes = bytes(pdf.output(dest='S'))
    buf.write(pdf_bytes)
    buf.seek(0)
    return send_file(buf, mimetype='application/pdf',
                     as_attachment=True,
                     download_name=f'loan_report_{pred_id}.pdf')

@app.route('/api/admin/users')
@admin_required
def admin_users():
    return jsonify([{
        'id': u.id, 'username': u.username, 'email': u.email,
        'role': u.role, 'created': u.created_at.strftime('%Y-%m-%d')
    } for u in User.query.all()])

@app.route('/api/admin/stats')
@admin_required
def admin_stats():
    all_preds = Prediction.query.all()
    total    = len(all_preds)
    approved = sum(1 for p in all_preds if p.result == 'APPROVED')
    avg_risk = round(sum(p.risk_pct for p in all_preds) / total, 2) if total else 0
    avg_conf = round(sum(p.confidence for p in all_preds) / total, 2) if total else 0
    return jsonify({'total': total, 'approved': approved, 'rejected': total-approved,
                    'avg_risk': avg_risk, 'avg_confidence': avg_conf,
                    'total_users': User.query.count()})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)
