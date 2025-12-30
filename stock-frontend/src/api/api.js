import axios from "axios";

const API = "http://127.0.0.1:8000";

export const getChart = symbol =>
  axios.get(`${API}/chart_data/${symbol}`).then(r => r.data);

export const analyze = symbol =>
  axios.get(`${API}/analyze/${symbol}`).then(r => r.data);

export const searchCompanies = query =>
  axios.get(`${API}/search?q=${query}`).then(r => r.data);
