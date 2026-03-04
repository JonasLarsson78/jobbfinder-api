# Jobbfinder

En enkel Node.js/Express-applikation som samlar och exponerar jobbannonser från olika källor.

## Beskrivning
Detta projekt aggregerar jobblistor (f.n. LinkedIn och kommundata) och erbjuder ett REST-endpoint för att hämta jobb.

## Förutsättningar
- Node.js (rekommenderat 14+)

## Installation
1. Klona repot eller kopiera filerna till en mapp.
2. Installera beroenden:

```bash
npm install
```

## Kör lokalt
Starta servern:

```bash
node server.js
```

Servern använder `server.js` som entrypoint. Eftersom det inte finns något `start`-skript i `package.json` används kommandot ovan.

## Endpoints (översikt)
- `routes/jobs.js` — API-routes för att hämta jobb.

## Viktiga filer
- `server.js` — applikationens entrypoint.
- `routes/jobs.js` — definierar jobb-endpoint.
- `lib/jobMapper.js` — hjälpfunktioner för att mappa jobbdatastrukturer.
- `lib/linkedin.js` — integration/logik för att hämta data från LinkedIn.
- `lib/municipalities.js` — kommunrelaterade data/lookup.

## Användning
Efter att servern körs, gör en HTTP GET mot den endpoint som `routes/jobs.js` exponerar (t.ex. `/jobs`) för att få listan med jobb.

## Exempel på request och svar

1) Enkel förfrågan (en kommun)

Request:

```bash
curl -s "http://localhost:3000/jobs?city=Stockholm&q=developer"
```

Exempel på framgångsrikt svar (HTTP 200):

```json
{
	"city": "Stockholm",
	"municipalityCode": "0180",
	"query": "developer",
	"result": {
		"total": 1,
		"afMatches": [
			{
				"headline": "Senior JavaScript Developer",
				"employer": "Acme AB",
				"webpage_url": "https://job.example/apply/1",
				"application_deadline": "2026-03-31",
				"number_of_vacancies": 1,
				"conditions": "Heltid",
				"salary_description": "Enligt avtal"
			}
		],
		"linkedinMatches": [
			{
				"title": "Senior JavaScript Developer",
				"company": "Acme AB",
				"location": "Stockholm",
				"datetime": "2026-03-15",
				"url": "https://job.example/apply/1"
			}
		]
	}
}
```

## Bidrag
För förslag eller pull requests, öppna en issue eller skapa en PR mot huvudbranchen.

## Licens
Inget licensfält specificerat i detta repo. Lägg till en `LICENSE`-fil om du vill ange villkor.
