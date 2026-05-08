// admin-settings.js - For managing social links (example)
const token = localStorage.getItem('token');

async function updateSocialLinks(whatsappUrl, facebookUrl) {
    const response = await fetch('/api/admin/social-links', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            whatsapp_group: whatsappUrl,
            facebook_page: facebookUrl
        })
    });
    
    if (response.ok) {
        alert('Social links updated successfully!');
        location.reload();
    } else {
        alert('Failed to update links. Make sure you are logged in as admin.');
    }
}

// Example usage (bind to a form)
// document.getElementById('updateLinksBtn').addEventListener('click', () => {
//     const whatsapp = document.getElementById('whatsappInput').value;
//     const facebook = document.getElementById('facebookInput').value;
//     updateSocialLinks(whatsapp, facebook);
// });
