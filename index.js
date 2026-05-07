const express = require('express');
const cors = require('cors');
app.use(cors()); // Esto permite que cualquier origen (Vercel) se conecteconst { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Endpoint para crear reserva y notificar
app.post('/api/reserve', async (req, res) => {
  const { date, time_slot, client_name, phone, service } = req.body;

  try {
    // 1. Guardar en DB
    const { data, error } = await supabase
      .from('appointments')
      .insert([{ date, time_slot, client_name, phone, service }])
      .select();

    if (error) throw error;

    // 2. Notificación WhatsApp Business API
    // Asegurate de tener el template "confirmacion_turno" aprobado en Meta
    await axios.post(
      `https://graph.facebook.com/v18.0/${process.env.WA_PHONE_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: phone,
        type: "template",
        template: {
          name: "confirmacion_turno",
          language: { code: "es" },
          components: [{
            type: "body",
            parameters: [
              { type: "text", text: client_name },
              { type: "text", text: `${date} a las ${time_slot}` }
            ]
          }]
        }
      },
      { headers: { Authorization: `Bearer ${process.env.WA_TOKEN}` } }
    );

    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));