import React, { useState } from 'react';

const ButtonTest: React.FC = () => {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('No clicks yet');

  const simpleClick = () => {
    console.log('Simple click function called');
    alert('Simple click works!');
  };

  const incrementClick = () => {
    console.log('Increment click called, count was:', count);
    setCount(count + 1);
    setMessage(`Clicked ${count + 1} times`);
  };

  const asyncClick = async () => {
    console.log('Async click started');
    setMessage('Processing...');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMessage('Async operation completed!');
      console.log('Async click completed');
    } catch (error) {
      console.error('Async click error:', error);
      setMessage('Error occurred');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Button Test Page</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Current State:</h3>
        <p>Count: {count}</p>
        <p>Message: {message}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
        <button
          onClick={simpleClick}
          style={{
            padding: '10px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Simple Click Test
        </button>

        <button
          onClick={incrementClick}
          style={{
            padding: '10px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Increment Counter
        </button>

        <button
          onClick={asyncClick}
          style={{
            padding: '10px',
            backgroundColor: '#FF9800',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Async Click Test
        </button>

        <button
          onClick={() => {
            console.log('Inline function works');
            alert('Inline function works!');
          }}
          style={{
            padding: '10px',
            backgroundColor: '#9C27B0',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Inline Function Test
        </button>

        <button
          onClick={() => {
            setCount(0);
            setMessage('Reset!');
          }}
          style={{
            padding: '10px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reset
        </button>
      </div>

      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
        <h4>Instructions:</h4>
        <ol>
          <li>Open browser console (F12)</li>
          <li>Click each button and observe:</li>
          <ul>
            <li>Are console messages appearing?</li>
            <li>Are alerts showing?</li>
            <li>Is the state updating?</li>
          </ul>
          <li>If any button doesn't work, there's a fundamental React/JavaScript issue</li>
        </ol>
      </div>
    </div>
  );
};

export default ButtonTest;
