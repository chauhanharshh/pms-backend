import axios from 'axios';

async function main() {
    try {
        const hotelId = 'ae5392a9-9bd2-42f7-a1ea-38022d1f218c';

        // We need an auth token. 
        // I'll see if I can find a user to login with or use a known one.
        // rayban: ae5392a9-9bd2-42f7-a1ea-38022d1f218c
        const loginRes = await axios.post('http://127.0.0.1:5000/api/auth/login', {
            username: 'rayban',
            password: 'password123' // Guessing common password
        });
        const token = loginRes.data.data.token;

        const res = await axios.get(`http://127.0.0.1:5000/api/restaurant/menu?hotelId=${hotelId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('API Response count:', res.data.data?.length);
        if (res.data.data?.length > 0) {
            console.log('First item:', JSON.stringify(res.data.data[0], null, 2));
        }

    } catch (err: any) {
        console.error('Error:', err.response?.data || err.message);
    }
}

main();
