export default function CareSignoff() {
  const testClick = () => {
    console.log("SIMPLE TEST CLICK!");
    alert("IT WORKS!");
  };

  return (
    <div style={{ padding: '50px' }}>
      <h1>Simple Test - Care SignOff</h1>
      <button 
        onClick={testClick} 
        style={{ 
          padding: '20px', 
          fontSize: '16px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        CLICK ME - Test Button
      </button>
      <p style={{ marginTop: '20px' }}>
        If this button doesn't work, there's a fundamental React issue.
      </p>
    </div>
  );
}
