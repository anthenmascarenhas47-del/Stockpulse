import axios from "axios";

const API = "http://127.0.0.1:8000";

// const API = "http://100.118.116.94:8000";

export const getChart = (symbol, interval = "1d") =>
  axios.get(`${API}/chart_data/${symbol}`, { params: { interval } }).then(r => r.data);

export const getAnalysis = (symbol, interval = "1d") =>
  axios.get(`${API}/analyze/${symbol}`, { params: { interval } }).then(r => r.data);

export const searchCompanies = query =>
  axios.get(`${API}/search?q=${query}`).then(r => r.data);

export const getMarket = () =>
  axios.get(`${API}/market`).then(r => r.data);

export const getCompany = (symbol) =>
  axios.get(`${API}/company/${symbol}`).then(r => r.data);

export const getIndices = async () => {
  try {
    const res = await axios.get(`${API}/indices`);
    return res.data;
  } catch (error) {
    console.error("Error fetching indices:", error);
    return [];
  }
};