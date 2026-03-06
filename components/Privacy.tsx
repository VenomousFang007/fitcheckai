import React from 'react';

const Privacy = () => {
  return (
    <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui, sans-serif', lineHeight: '1.6' }}>
      <h1 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Privacy Policy for FitCheck AI</h1>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>Last Updated: February 3, 2026</p>

<button
  onClick={() => window.dispatchEvent(new Event('close-legal'))}
  style={{
    marginBottom: '24px',
    fontWeight: 600,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#333',
    padding: 0
  }}
>
  ← Back
</button>
      

      <h2>1. Introduction</h2>
      <p>
        FitCheck AI ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how our web and mobile application collects, uses, and safeguards your information.
      </p>

      <h2>2. Information We Collect</h2>
      <ul>
        <li><strong>Account Information:</strong> When you sign in via Google, we collect your email address and basic profile information (name, profile picture) solely for authentication and user identification purposes.</li>
        <li><strong>User Content:</strong> We collect the photos you upload for style analysis.</li>
        <li><strong>Usage Data:</strong> We may collect anonymous metrics on how features are used to improve the app.</li>
      </ul>

      <h2>3. How We Use Your Information</h2>
      <p>We use your information strictly to:</p>
      <ul>
        <li>Authenticate your identity via Supabase Auth.</li>
        <li>Provide style feedback and analysis using Artificial Intelligence (Google Gemini API).</li>
        <li>Maintain your history of uploads within the app.</li>
      </ul>

      <h2>4. Third-Party Services</h2>
      <p>We utilize the following third-party services to operate FitCheck AI:</p>
      <ul>
        <li><strong>Supabase:</strong> Used for database hosting, file storage, and authentication management.</li>
        <li><strong>Google Gemini API:</strong> User-uploaded images are processed by Google's generative AI to provide fashion insights. These images are processed according to Google's API data policies.</li>
      </ul>

      <h2>5. Data Security & Retention</h2>
      <p>
        Your data is stored securely using Supabase (hosted on AWS). We do not sell your personal data to advertisers or third parties. 
        Images are retained only as long as necessary to provide the service or until you delete them.
      </p>

      <h2>6. User Rights & Data Deletion</h2>
      <p>
        You have the right to request the deletion of your data at any time. 
        You can delete your account and all associated data directly within the app settings, or by contacting us at <strong>abimbolaabdsamad07@gmail.com</strong>.
      </p>

      <h2>7. Contact Us</h2>
      <p>
        If you have questions about this policy, please contact us at:
        <br />
        <strong>abimbolaabdsamad07@gmail.com</strong>
      </p>
    </div>
  );
};

export default Privacy;