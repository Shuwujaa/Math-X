import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from './AuthContext';
import './LoginPage.css';

const LoginPage = () => {
  const { login } = useAuth();

  const handleSuccess = (credentialResponse) => {
    login(credentialResponse);
  };

  const handleError = () => {
    console.log('Login Failed');
  };

  return (
    <div className="login-container">
      <div className="background-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
      
      <div className="login-card">
        <div className="login-hero-icon">
          <i className="fas fa-brain-circuit"></i>
        </div>
        
        <div className="login-brand">
          <h1>MATH-X <span>LMS</span></h1>
          <p>The Future of Intelligence</p>
        </div>
        
        <div className="login-content">
          <div className="education-badge">
            <i className="fas fa-shield-check"></i> Verified Assessment Platform
          </div>
          <h2>Accelerate Your Learning</h2>
          <p>Experience the next generation of mathematical assessments with real-time analytics and gamified progression.</p>
          
          <div className="google-btn-wrapper">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={handleError}
              useOneTap
              theme="filled_blue"
              shape="pill"
              size="large"
              text="continue_with"
            />
          </div>
        </div>
        
        <div className="login-footer">
          <p>Trusted by Elite Institutions worldwide</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
