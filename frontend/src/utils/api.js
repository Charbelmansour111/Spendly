import axios from 'axios'

const API = axios.create({
  baseURL: 'https://spendly-backend-et20.onrender.com/api'
})

export default API