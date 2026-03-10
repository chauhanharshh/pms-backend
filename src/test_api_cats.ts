import axios from 'axios';

async function main() {
    try {
        // Use a known hotelId from duplicates_debug.txt
        // Suvidha Deluxe: 3c332e23-e7ff-4aff-8ae3-3771ee4dc46e
        const hotelId = '3c332e23-e7ff-4aff-8ae3-3771ee4dc46e';

        // We need an auth token. I'll login first.
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            username: 'suvidha',
            password: 'password123' // Assuming default password
        });
        const token = loginRes.data.data.token;

        const res = await axios.get(`http://localhost:5000/api/restaurant/categories?hotelId=${hotelId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('API Response (first category):', JSON.stringify(res.data.data[0], null, 2));
    } catch (err: any) {
        console.error('Error:', err.response?.data || err.message);
    }
}

main();
