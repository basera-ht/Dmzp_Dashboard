import Papa from 'papaparse'
import { config } from '../config/index.js'

async function run() {
  const csvUrl = config.googleSheets.csvUrl
  const response = await fetch(csvUrl)
  const csvText = await response.text()
  const result = Papa.parse(csvText, { header: true })
  console.log('Headers:', result.meta.fields)
  console.log('First Row Raw:', result.data[0])
}

run()
