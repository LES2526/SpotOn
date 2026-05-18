fetch('http://localhost:3000/api/spaces/cmnd99fn10009k4bjhcljg3do/sessions', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ expectedEndTime: new Date().toISOString() }),
})
  .then(res => res.json().then(data => console.log('OK', data)))
  .catch(err => console.log('ERROR', err.message));