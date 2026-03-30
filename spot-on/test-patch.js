const axios = require('axios');
axios.patch('http://localhost:3000/api/spaces/cmnd99fn10009k4bjhcljg3do/sessions', { expectedEndTime: new Date().toISOString() })
  .then(res => console.log('OK', res.data))
  .catch(err => console.log('ERROR', err.response ? err.response.status : err.message));
