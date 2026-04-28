
const fetch = require('node-fetch')

async function test() {
    console.log("Testing /api/admin/system/integrations...")
    try {
        const res = await fetch('http://localhost:3000/api/admin/system/integrations')
        const data = await res.json()
        console.log("Response Status:", res.status)
        console.log("Internal Services found:", data.internal?.length || 0)
        console.log("Internal Services IDs:", data.internal?.map(s => s.id))
    } catch (e) {
        console.log("Error:", e.message)
    }
}

test()
