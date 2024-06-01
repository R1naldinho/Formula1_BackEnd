require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const { exec } = require('child_process');
const mysql = require('mysql');


const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});


app.listen(port, () => {
    console.log(`Server in ascolto sulla porta ${port}`);
});


const secretKey = 'your_secret_key';

// Funzione per generare un token di accesso JWT
const generateAccessToken = (user) => {
    return jwt.sign({ id: user.id, username: user.username }, secretKey, { expiresIn: '30m' });
};

// Gestione del login// Gestione del login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    // Query per ottenere l'utente dal database
    const sql = 'SELECT * FROM users WHERE username = ?';
    connection.query(sql, [username], (err, results) => {
        if (err) {
            console.error('Errore durante il recupero dell\'utente dal database:', err);
            res.status(500).send('Errore del server');
            return;
        }
        if (results.length === 0) {
            res.status(401).json({ error: 'Credenziali non valide' });

            return;
        }
        const user = results[0];
        // Verifica se la password inviata dal frontend corrisponde a quella salvata nel database
        if (password === user.password) {
            const accessToken = generateAccessToken(user); // Genera un token di accesso
            res.json({ accessToken, redirectTo: '/FrontEnd/admin/index.html' });
        } else {
            res.status(401).json({ error: 'Credenziali non valide' });

        }
    });
});


// Middleware per verificare il token di accesso nelle richieste protette
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, secretKey, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Pagina protetta sul backend
app.get('/admin', authenticateToken, (req, res) => {
    res.send('Benvenuto nella root admin!');
});


// API per ottenere i codici dei paesi
app.get('/api/countriesJSON', async (req, res) => {
    try {
        const data = await fs.readFile('./json/country_code.json', 'utf8');
        const jsonData = JSON.parse(data);
        res.json(jsonData);
    } catch (error) {
        console.error('Errore durante il fetch dei dati:', error);
        res.status(500).json({ error: 'Errore nel server' });
    }
});


// API per ottenere i colori delle gomme
app.get('/api/tyresJSON', async (req, res) => {
    try {
        const data = await fs.readFile('./json/tyres_colors.json', 'utf8');
        const jsonData = JSON.parse(data);
        res.json(jsonData);
    } catch (error) {
        console.error('Errore durante il fetch dei dati:', error);
        res.status(500).json({ error: 'Errore nel server' });
    }
});


// Circuit Map
app.get('/api/circuitMap/:year/:circuitKey', async (req, res) => {
    const { year, circuitKey } = req.params;
    if (year == '2020' && circuitKey == 149) {
        return res.json({ map: 'https://www.formula1.com/content/dam/fom-website/circuits/2020/abu-dhabi-international-circuit.jpg.transform/9col/image.jpg' });
    }
    try {
        const response = await axios.get(`https://api.multiviewer.app/api/v1/circuits/${circuitKey}/${year}`);
        res.json(response.data);
    } catch (error) {
        console.error('Errore durante il fetch dei dati:', error);
        res.status(500).json({ error: 'Errore nel server' });
    }
});

// API per ottenere i dati delle gare di Formula 1 di un determinato anno
app.get('/api/races/:year', async (req, res) => {
    const { year } = req.params;
    try {
        const response = await axios.get(`https://livetiming.formula1.com/static/${year}/Index.json`);
        res.json(response.data);
    } catch (error) {
        console.error('Errore durante il fetch dei dati:', error);
        res.status(500).json({ error: 'Errore nel server' });
    }
});

// API per ottenere i dati di una gara di Formula 1 di un determinato anno e id
app.get('/api/races/:year/:meetingKey', async (req, res) => {
    const { year, meetingKey } = req.params;
    try {
        const response = await axios.get(`https://livetiming.formula1.com/static/${year}/Index.json`);
        let responseRaces = response.data;

        // Filtra gli incontri
        let filteredMeetings = [];

        responseRaces.Meetings.forEach(meeting => {
            console.log(meeting, meeting.Key, meetingKey)
            if(meeting.Key == meetingKey){
                filteredMeetings.push(meeting);
            }
        });

        console.log(filteredMeetings);
        res.json(filteredMeetings);
    } catch (error) {
        console.error('Errore durante il fetch dei dati:', error);
        res.status(500).json({ error: 'Errore nel server' });
    }
});



// API per ottenere gli endpoint di una sessione di Formula 1
app.get('/api/session/:path(*)', async (req, res) => {
    const { path } = req.params;
    try {
        const response = await axios.get(`https://livetiming.formula1.com/static/${path}Index.json`);
        res.json(response.data);
    } catch (error) {
        console.error('Errore durante il fetch dei dati:', error);
        res.status(500).json({ error: 'Errore nel server' });
    }
});

// Session Info
app.get('/api/sessionInfo/:path(*)', async (req, res) => {
    const { path } = req.params;
    try {
        const response = await axios.get(`https://livetiming.formula1.com/static/${path}SessionInfo.json`);
        res.json(response.data);
    } catch (error) {
        console.error('Errore durante il fetch dei dati:', error);
        res.status(500).json({ error: 'Errore nel server' });
    }
});

// Driver List
app.get('/api/driverList/:path(*)', async (req, res) => {
    const { path } = req.params;
    try {
        const response = await axios.get(`https://livetiming.formula1.com/static/${path}DriverList.json`);
        res.json(response.data);
    } catch (error) {
        console.error('Errore durante il fetch dei dati:', error);
        res.status(500).json({ error: 'Errore nel server' });
    }
});

// Tyre Stint Series
app.get('/api/tyreStintSeries/:path(*)', async (req, res) => {
    const { path } = req.params;
    try {
        const response = await axios.get(`https://livetiming.formula1.com/static/${path}TyreStintSeries.json`);
        res.json(response.data);
    } catch (error) {
        console.error('Errore durante il fetch dei dati:', error);
        res.status(500).json({ error: 'Errore nel server' });
    }
});

// Weather Data Series
app.get('/api/weatherDataSeries/:path(*)', async (req, res) => {
    const { path } = req.params;
    try {
        const response = await axios.get(`https://livetiming.formula1.com/static/${path}WeatherDataSeries.json`);
        res.json(response.data);
    } catch (error) {
        console.error('Errore durante il fetch dei dati:', error);
        res.status(500).json({ error: 'Errore nel server' });
    }
});

// Lap Series
app.get('/api/lapSeries/:path(*)', async (req, res) => {
    const { path } = req.params;
    try {
        const response = await axios.get(`https://livetiming.formula1.com/static/${path}LapSeries.json`);
        res.json(response.data);
    } catch (error) {
        console.error('Errore durante il fetch dei dati:', error);
        res.status(500).json({ error: 'Errore nel server' });
    }
});

// Top Three
app.get('/api/topThree/:path(*)', async (req, res) => {
    const { path } = req.params;
    try {
        const response = await axios.get(`https://livetiming.formula1.com/static/${path}TopThree.json`);
        res.json(response.data);
    } catch (error) {
        console.error('Errore durante il fetch dei dati:', error);
        res.status(500).json({ error: 'Errore nel server' });
    }
});

let previousPath = null;

function savePreviousPathToFile() {
    fs.writeFile('previousPath.txt', previousPath, (err) => {
        if (err) {
            console.error('Errore durante il salvataggio di previousPath su disco:', err);
        } else {
            console.log('previousPath salvato su disco.');
        }
    });
}

// Funzione per leggere il valore di previousPath da disco
function loadPreviousPathFromFile() {
    fs.readFile('previousPath.txt', 'utf8', (err, data) => {
        if (err) {
            console.error('Errore durante la lettura di previousPath da disco:', err);
        } else {
            previousPath = data.trim();
            console.log('previousPath caricato da disco:', previousPath);
        }
    });
}

loadPreviousPathFromFile();

//Telemetry
app.get('/api/getTelemetry/:path(*)', async (req, res) => {
    const { path } = req.params;
    if (path == previousPath && previousPath != null) {
        return res.json({ response: "Loaded" });
    }
    previousPath = path;
    savePreviousPathToFile();
    const command = `python telemetry.py ${path} telemetry.json`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Errore durante l'esecuzione dello script Python: ${error}`);
            return res.status(500).json({ error: 'Errore durante l\'esecuzione dello script Python' });
        }
        console.log('JSON file created')
        res.json({ response: "Loaded" });
    });
});

app.get('/api/telemetryGetUTC', async (req, res) => {
    try {
        const jsonData = await fs.readFile('./telemetry.json', 'utf-8');
        const telemetryData = JSON.parse(jsonData);

        // Array per memorizzare le voci UTC
        const utcEntries = [];

        // Itera attraverso ogni elemento nel telemetryData
        telemetryData.forEach(item => {
            const { data } = item;
            const entries = data?.Entries || [];

            // Itera attraverso ogni voce in Entries
            entries.forEach(entry => {
                // Se l'elemento ha un campo 'Utc', aggiungilo all'array utcEntries
                if (entry?.Utc) {
                    utcEntries.push({ utc: entry.Utc });
                }
            });
        });

        // Restituisci l'array utcEntries come risposta
        res.json(utcEntries);
    } catch (err) {
        console.error('Errore durante il recupero o il parsing del file JSON:', err);
        res.status(500).send('Errore durante il recupero o il parsing del file JSON');
    }
});




app.get('/api/telemetryData/:UTC(*)', async (req, res) => {
    const { UTC } = req.params;
    try {
        const jsonData = await fs.readFile('./telemetry.json', 'utf-8');
        const telemetryData = JSON.parse(jsonData);

        let carsData = null;
        telemetryData.forEach(item => {
            const { data } = item;
            const entries = data?.Entries || [];
            entries.forEach(entry => {
                if (entry.Utc === UTC) {
                    carsData = entry.Cars;
                }
            });
        });

        if (carsData) {
            res.json(carsData);
        } else {
            res.status(404).send('Dati non trovati per l\'UTC specificato');
        }
    } catch (err) {
        console.error('Errore durante il recupero o il parsing del file JSON:', err);
        res.status(500).send('Errore durante il recupero o il parsing del file JSON');
    }
});


//Car Position
app.get('/api/getCarPosition/:path(*)', async (req, res) => {
    const { path } = req.params;

    if (path == previousPath && previousPath != null) {
        return res.json({ response: "Loaded" });
    }
    previousPath = path;
    savePreviousPathToFile();
    const command = `python position.py ${path} position.json`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Errore durante l'esecuzione dello script Python: ${error}`);
            return res.status(500).json({ error: 'Errore durante l\'esecuzione dello script Python' });
        }
        console.log('JSON file created')
        res.json({ response: "Loaded" });
    });
});





//###############################################################################################
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root', // Modifica con il tuo nome utente MySQL
    password: '', // Modifica con la tua password MySQL
    database: 'f1' // Modifica con il nome del tuo database MySQL
});

// Connect to the database
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to the database: ' + err.stack);
        return;
    }
    console.log('Successfully connected to the MySQL database.');
});

// Endpoint to get circuit data
app.get('/circuits', (req, res) => {
    connection.query('SELECT * FROM circuits', (err, rows) => {
        if (err) {
            console.error('Error during the query: ' + err.stack);
            return res.status(500).send('Server error');
        }
        res.json(rows);
    });
});

// Endpoint to get circuit data with key
app.get('/circuits/circuitKey/:key', (req, res) => {
    let key = req.params.key;
    connection.query(`SELECT * FROM circuits WHERE circuitKey = '${key}'`, (err, rows) => {
        if (err) {
            console.error('Error during the query: ' + err.stack);
            return res.status(500).send('Server error');
        }
        res.json(rows);
    });
});

// Endpoint to get constructor results data
app.get('/constructorResults', (req, res) => {
    connection.query('SELECT * FROM constructorResults', (err, rows) => {
        if (err) {
            console.error('Error during the query: ' + err.stack);
            return res.status(500).send('Server error');
        }
        res.json(rows);
    });
});

// Endpoint to get constructor standings data
app.get('/constructorStandings', (req, res) => {
    connection.query('SELECT * FROM constructorStandings', (err, rows) => {
        if (err) {
            console.error('Error during the query: ' + err.stack);
            return res.status(500).send('Server error');
        }
        res.json(rows);
    });
});

// Endpoint to get constructors data
app.get('/constructors', (req, res) => {
    connection.query('SELECT * FROM constructors', (err, rows) => {
        if (err) {
            console.error('Error during the query: ' + err.stack);
            return res.status(500).send('Server error');
        }
        res.json(rows);
    });
});

// Endpoint to get driver standings data
app.get('/driverStandings', (req, res) => {
    connection.query('SELECT * FROM driverStandings', (err, rows) => {
        if (err) {
            console.error('Error during the query: ' + err.stack);
            return res.status(500).send('Server error');
        }
        res.json(rows);
    });
});

// Endpoint to get drivers data
app.get('/drivers', (req, res) => {
    connection.query('SELECT * FROM drivers', (err, rows) => {
        if (err) {
            console.error('Error during the query: ' + err.stack);
            return res.status(500).send('Server error');
        }
        res.json(rows);
    });
});

// Endpoint to get lap times data
app.get('/lapTimes', (req, res) => {
    connection.query('SELECT * FROM lapTimes', (err, rows) => {
        if (err) {
            console.error('Error during the query: ' + err.stack);
            return res.status(500).send('Server error');
        }
        res.json(rows);
    });
});

// Endpoint to get pit stops data
app.get('/pitStops', (req, res) => {
    connection.query('SELECT * FROM pitStops', (err, rows) => {
        if (err) {
            console.error('Error during the query: ' + err.stack);
            return res.status(500).send('Server error');
        }
        res.json(rows);
    });
});

// Endpoint to get qualifying data
app.get('/qualifying', (req, res) => {
    connection.query('SELECT * FROM qualifying', (err, rows) => {
        if (err) {
            console.error('Error during the query: ' + err.stack);
            return res.status(500).send('Server error');
        }
        res.json(rows);
    });
});

// Endpoint to get races data
app.get('/races', (req, res) => {
    connection.query('SELECT * FROM races', (err, rows) => {
        if (err) {
            console.error('Error during the query: ' + err.stack);
            return res.status(500).send('Server error');
        }
        res.json(rows);
    });
});

// Endpoint to get races data with year
app.get('/races/year/:year', (req, res) => {
    let year = req.params.year;
    connection.query(`SELECT * FROM races WHERE year = '${year}'`, (err, rows) => {
        if (err) {
            console.error('Error during the query: ' + err.stack);
            return res.status(500).send('Server error');
        }
        res.json(rows);
    });
});

//Endpoint to get a race with year and id
app.get('/races/year/:year/id/:id', (req, res) => {
    let year = req.params.year;
    let id = req.params.id;
    connection.query(`SELECT * FROM races WHERE year = '${year}' AND raceId = '${id}'`, (err, rows) => {
        if (err) {
            console.error('Error during the query: ' + err.stack);
            return res.status(500).send('Server error');
        }
        res.json(rows);
    });
});

// Endpoint to get results data
app.get('/results', (req, res) => {
    connection.query('SELECT * FROM results', (err, rows) => {
        if (err) {
            console.error('Error during the query: ' + err.stack);
            return res.status(500).send('Server error');
        }
        res.json(rows);
    });
});

// Endpoint to get seasons data
app.get('/seasons', (req, res) => {
    connection.query('SELECT * FROM seasons', (err, rows) => {
        if (err) {
            console.error('Error during the query: ' + err.stack);
            return res.status(500).send('Server error');
        }
        res.json(rows);
    });
});

// Endpoint to get status data
app.get('/status', (req, res) => {
    connection.query('SELECT * FROM status', (err, rows) => {
        if (err) {
            console.error('Error during the query: ' + err.stack);
            return res.status(500).send('Server error');
        }
        res.json(rows);
    });
});

//###############################################################################################
// API DB circuiti
// API per ottenere tutti i circuiti
app.get('/admin/api/circuits', (req, res) => {
    const sql = 'SELECT * FROM circuits';
    console.log(sql);
    connection.query(sql, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(results);
    });
});

// API per ottenere un circuito specifico
app.get('/admin/api/circuits/:id', (req, res) => {
    const circuitId = req.params.id;
    console.log(circuitId);
    const sql = 'SELECT * FROM circuits WHERE circuitId = ?';
    connection.query(sql, circuitId, (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (result.length === 0) {
            res.status(404).json({ message: 'Circuito non trovato' });
            return;
        }
        res.json(result[0]);
    });
});

// API per aggiungere un nuovo circuito
app.post('/admin/api/circuits', (req, res) => {
    const circuitData = req.body;
    const sql = 'INSERT INTO circuits SET ?';
    connection.query(sql, circuitData, (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.status(201).send('Circuito aggiunto con successo');
    });
});

// API per modificare un circuito esistente
app.put('/admin/api/circuits/:id', (req, res) => {
    const circuitId = req.params.id;
    const circuitData = req.body;
    console.log(circuitData);
    const sql = 'UPDATE circuits SET ? WHERE circuitId = ?';
    connection.query(sql, [circuitData, circuitId], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.status(200).send('Circuito modificato con successo');
    });
});

// API per eliminare un circuito
app.delete('/admin/api/circuits/:id', (req, res) => {
    const circuitId = req.params.id;
    const sql = 'DELETE FROM circuits WHERE circuitId = ?';
    connection.query(sql, circuitId, (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.status(200).send('Circuito eliminato con successo');
    });
});



//API per ottenere i dati delle gare
app.get('/admin/api/races', (req, res) => {
    const sql = 'SELECT * FROM races';
    connection.query(sql, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(results);
    });
});

// API per ottenere una gara specifica
app.get('/admin/api/races/:id', (req, res) => {
    const raceId = req.params.id;
    const sql = 'SELECT * FROM races WHERE raceId = ?';
    connection.query(sql, raceId, (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (result.length === 0) {
            res.status(404).json({ message: 'Gara non trovata' });
            return;
        }
        res.json(result[0]);
    });
});

// API per aggiungere una nuova gara
app.post('/admin/api/races', (req, res) => {
    const raceData = req.body;
    console.log(raceData);
    const sql = 'INSERT INTO races SET ?';
    connection.query(sql, raceData, (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.status(201).send('Gara aggiunta con successo');
    });
});

// API per modificare una gara esistente
app.put('/admin/api/races/:id', (req, res) => {
    const raceId = req.params.id;
    const raceData = req.body;
    console.log(raceData);
    const sql = 'UPDATE races SET ? WHERE raceId = ?';
    connection.query(sql, [raceData, raceId], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.status(200).send('Gara modificata con successo');
    });
})

// API per eliminare una gara
app.delete('/admin/api/races/:id', (req, res) => {
    const raceId = req.params.id;
    const sql = 'DELETE FROM races WHERE raceId = ?';
    connection.query(sql, raceId, (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.status(200).send('Gara eliminata con successo');
    });
});


