import fetch from 'node-fetch';

async function testPython() {
  try {
    const res = await fetch('http://localhost:8000/health');
    const data = await res.json();
    console.log('Python Health:', data);
  } catch (err) {
    console.error('Python not reachable:', err.message);
  }
}

testPython();
