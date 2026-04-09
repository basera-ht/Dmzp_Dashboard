import { fetchFormData } from '../services/googleSheets.js';

async function test() {
  try {
    console.log('Fetching data with forceRefresh=true...');
    const data = await fetchFormData(true);
    console.log('Total entries found:', data.allEntries.length);
    console.log('Entries:', JSON.stringify(data.allEntries.slice(0, 5), null, 2));
    
    // Check for specific columns
    if (data.allEntries.length > 0) {
      const first = data.allEntries[0];
      console.log('Sample Row keys:', Object.keys(first));
    }
  } catch (err) {
    console.error('Test failed:', err);
  }
}

test();
