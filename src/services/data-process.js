import Config from '../config.js'
import * as d3 from 'd3'

class DataProcessor {
    constructor() {
        this.countryNames = {}
        this.codeToName = {}
        this.nameToCode = {}
        this.buildTranslation()
    }


    async loadData() {
        const countryNames = {}
        const timeSeriesconfirmed = await d3.csv(Config.timeSeriesconfirmed)
        const timeSeriesDeath = await d3.csv(Config.timeSeriesDeath)
        const timeSeriesRecovered = await d3.csv(Config.timeSeriesRecovered)
        
        const dates = []
        for (let key in timeSeriesconfirmed[0]) {
            if (key != 'Country/Region' && key != 'Lat' && key != 'Long' && key != 'Province/State') {
                dates.push(key)
            }
        }

        const timeSeriesconfirmedData = []
        const timeSeriesDeathData = []
        const timeSeriesRecoveredData = []
        const getValuesInDate = (f, d, dd) => {
            f.forEach(c => {
                let cc = c['Country/Region']
                countryNames[cc] = true
                if (dd[cc]) {
                    dd[cc] += parseInt(c[d])
                } else {
                    dd[cc] = parseInt(c[d])
                }
            })
        }
        for (let d of dates) {
            const confirmed = {}
            const death = {}
            const recovered = {}
            let date = new Date(d)
            getValuesInDate(timeSeriesconfirmed, d, confirmed)
            getValuesInDate(timeSeriesDeath, d, death)
            getValuesInDate(timeSeriesRecovered, d, recovered)
            timeSeriesconfirmedData.push([date, confirmed])
            timeSeriesDeathData.push([date, death])
            timeSeriesRecoveredData.push([date, recovered])
        }
        const totalDays = dates.length
        this.countryNames = Object.keys(countryNames)
        this.currentData = this.countryNames.map(c => ({name: c,
                                                        confirmed: timeSeriesconfirmedData[totalDays-1][1][c],
                                                        death: timeSeriesDeathData[totalDays-1][1][c],
                                                        recovered: timeSeriesRecoveredData[totalDays-1][1][c],}))
        this.timeSeriesData = {timeSeriesconfirmedData, timeSeriesDeathData, timeSeriesRecoveredData}
        this.rawData = {timeSeriesconfirmed, timeSeriesDeath, timeSeriesRecovered}
        this.dates = dates
    }
    
    buildAnimationFrames(options) {
        const {k, n, type} = options
        const data = this.getTimeSeriesData(type)

        function interpolateData(data1, data2) {
            const [date1, values1] = data1
            const [date2, values2] = data2
            return t =>  {
                const f = {date: date1 * (1-t) + date2 * t,
                           values: {},
                           top: [],
                           prev: null,
                           next: null}
                const interpolatedValue = []
                for (let name in values1) {
                    const entry = {name, value: values1[name] * (1-t) + values2[name] * t}
                    interpolatedValue.push(entry)
                }
                interpolatedValue.sort((a, b) => b.value - a.value)
                interpolatedValue.forEach((d, i) => {
                    f.values[d.name] = {value: d.value, rank: Math.min(n, i)}
                    if (f.top.length < n && d.value > 0) {
                        f.top.push(d.name)
                    }
                })
                f.prev = f.next = f.values
                return f
            }
        }

        const keyframes = []
        function addFrame(t, f) {
            const prevFrame = keyframes.slice(-1)[0]
            const curFrame = f(t)
            if (prevFrame) {
                curFrame.prev = prevFrame.values
                prevFrame.next = curFrame.values
            }
            keyframes.push(curFrame)
        }

        for (let [d1, d2] of d3.pairs(data)) {
            const f = interpolateData(d1, d2)
            for (let i = 0; i < k; ++i) {
                const t = i / k
                addFrame(t, f)
            }
        }
        const lastData = data.slice(-1)[0]
        const f = interpolateData(lastData, lastData)
        addFrame(0, f)

        this.keyframes = keyframes
        return this.keyframes
    }

    getTimeSeriesData(type) {
        let data = null
        const {timeSeriesconfirmedData, timeSeriesDeathData, timeSeriesRecoveredData} = this.timeSeriesData
        if (type == 'confirmed') {
            data = timeSeriesconfirmedData
        } else if (type == 'death') {
            data = timeSeriesDeathData
        } else {
            data = timeSeriesRecoveredData
        }
        return data
    }

    getCountryCode(name) {
        return this.nameToCode[name]
    }
    
    getCountryName(code) {
        return this.codeToName[code]
    }

    getAllCountryNames() {
        return this.countryNames
    }

    getAnimationFrames(options) {
        return this.buildAnimationFrames(options)
    }

    getRawData() {
        return this.rawData
    }

    getCurrentData() {
        return this.currentData
    }

    getCountryData(countries, type) {
        const timeSeriesData = this.getTimeSeriesData(type)

        const data = timeSeriesData.map(d => {
            const [date, val] = d
            const obj = {}
            for (let c of countries) {
                obj[c] = val[c]
            }
            return [date, obj]
        })
        return data
    }

    getCountryAllData(country) {
        const {timeSeriesconfirmedData, timeSeriesDeathData, timeSeriesRecoveredData} = this.timeSeriesData
        const data = this.dates.map((d, i) => ({date: (new Date(d)).getTime(),
                                                confirmed: timeSeriesconfirmedData[i][1][country],
                                                death: timeSeriesDeathData[i][1][country],
                                                recovered: timeSeriesRecoveredData[i][1][country]}))
        return data
    }

    async getTopoData() {
        if (!this.topoData) {
            this.topoData = await d3.json(Config.topoData)
            return this.topoData
        } else {
            return this.topoData
        }
    }


    buildTranslation() {
        this.codeToName = {
            AD: "Andorra",
            AE: "United Arab Emirates",
            AF: "Afghanistan",
            AG: "Antigua and Barbuda",
            AI: "Anguilla",
            AL: "Albania",
            AM: "Armenia",
            AO: "Angola",
            AQ: "Antarctica",
            AR: "Argentina",
            AS: "American Samoa",
            AT: "Austria",
            AU: "Australia",
            AW: "Aruba",
            AX: "Åland Islands",
            AZ: "Azerbaijan",
            BA: "Bosnia and Herzegovina",
            BB: "Barbados",
            BD: "Bangladesh",
            BE: "Belgium",
            BF: "Burkina Faso",
            BG: "Bulgaria",
            BH: "Bahrain",
            BI: "Burundi",
            BJ: "Benin",
            BL: "Saint Barthélemy",
            BM: "Bermuda",
            BN: "Brunei Darussalam",
            BO: "Bolivia, Plurinational State of",
            BR: "Brazil",
            BS: "Bahamas",
            BT: "Bhutan",
            BW: "Botswana",
            BY: "Belarus",
            BZ: "Belize",
            CA: "Canada",
            CC: "Cocos Islands",
            CD: "Congo, the Democratic Republic of the",
            CF: "Central African Republic",
            CG: "Congo",
            CH: "Switzerland",
            CI: "Côte d'Ivoire",
            CK: "Cook Islands",
            CL: "Chile",
            CM: "Cameroon",
            CN: "China",
            CO: "Colombia",
            CR: "Costa Rica",
            CU: "Cuba",
            CV: "Cape Verde",
            CW: "Curaçao",
            CX: "Christmas Island",
            CY: "Cyprus",
            CZ: "Czech Republic",
            DE: "Germany",
            DJ: "Djibouti",
            DK: "Denmark",
            DM: "Dominica",
            DO: "Dominican Republic",
            DZ: "Algeria",
            EC: "Ecuador",
            EE: "Estonia",
            EG: "Egypt",
            EH: "Western Sahara",
            ER: "Eritrea",
            ES: "Spain",
            ET: "Ethiopia",
            FI: "Finland",
            FJ: "Fiji",
            FK: "Falkland Islands (Malvinas)",
            FM: "Micronesia, Federated States of",
            FO: "Faroe Islands",
            FR: "France",
            GA: "Gabon",
            GB: "United Kingdom",
            GD: "Grenada",
            GE: "Georgia",
            GF: "French Guiana",
            GG: "Guernsey",
            GH: "Ghana",
            GL: "Greenland",
            GM: "Gambia",
            GN: "Guinea",
            GQ: "Equatorial Guinea",
            GR: "Greece",
            GS: "South Georgia and the South Sandwich Islands",
            GT: "Guatemala",
            GU: "Guam",
            GW: "Guinea-Bissau",
            GY: "Guyana",
            HK: "Hong Kong",
            HM: "Heard Island and McDonald Islands",
            HN: "Honduras",
            HR: "Croatia",
            HT: "Haiti",
            HU: "Hungary",
            ID: "Indonesia",
            IE: "Ireland",
            IL: "Israel",
            IM: "Isle of Man",
            IN: "India",
            IO: "British Indian Ocean Territory",
            IQ: "Iraq",
            IR: "Iran, Islamic Republic of",
            IS: "Iceland",
            IT: "Italy",
            JE: "Jersey",
            JM: "Jamaica",
            JO: "Jordan",
            JP: "Japan",
            KE: "Kenya",
            KG: "Kyrgyzstan",
            KH: "Cambodia",
            KI: "Kiribati",
            KM: "Comoros",
            KN: "Saint Kitts and Nevis",
            KP: "Korea, Democratic People's Republic of",
            KR: "Korea, Republic of",
            KW: "Kuwait",
            KY: "Cayman Islands",
            KZ: "Kazakhstan",
            LA: "Lao People's Democratic Republic",
            LB: "Lebanon",
            LC: "Saint Lucia",
            LI: "Liechtenstein",
            LK: "Sri Lanka",
            LR: "Liberia",
            LS: "Lesotho",
            LT: "Lithuania",
            LU: "Luxembourg",
            LV: "Latvia",
            LY: "Libya",
            MA: "Morocco",
            MC: "Monaco",
            MD: "Macedonia, the former Yugoslav Republic of",
            ME: "Montenegro",
            MF: "Saint Martin (French part)",
            MG: "Madagascar",
            MH: "Marshall Islands",
            ML: "Mali",
            MM: "Myanmar",
            MN: "Mongolia",
            MO: "Macao",
            MP: "Northern Mariana Islands",
            MR: "Mauritania",
            MS: "Montserrat",
            MT: "Malta",
            MU: "Mauritius",
            MV: "Maldives",
            MW: "Malawi",
            MX: "Mexico",
            MY: "Malaysia",
            MZ: "Mozambique",
            NA: "Namibia",
            NC: "New Caledonia",
            NE: "Niger",
            NF: "Norfolk Island",
            NG: "Nigeria",
            NI: "Nicaragua",
            NL: "Netherlands",
            NO: "Norway",
            NP: "Nepal",
            NR: "Nauru",
            NU: "Niue",
            NZ: "New Zealand",
            OM: "Oman",
            PA: "Panama",
            PE: "Peru",
            PF: "French Polynesia",
            PG: "Papua New Guinea",
            PH: "Philippines",
            PK: "Pakistan",
            PL: "Poland",
            PM: "Saint Pierre and Miquelon",
            PN: "Pitcairn",
            PR: "Puerto Rico",
            PS: "Palestine, State of",
            PT: "Portugal",
            PW: "Palau",
            PY: "Paraguay",
            QA: "Qatar",
            RO: "Romania",
            RS: "Serbia",
            RU: "Russian Federation",
            RW: "Rwanda",
            SA: "Saudi Arabia",
            SB: "Solomon Islands",
            SC: "Seychelles",
            SD: "Sudan",
            SE: "Sweden",
            SG: "Singapore",
            SH: "Saint Helena, Ascension and Tristan da Cunha",
            SI: "Slovenia",
            SK: "Slovakia",
            SL: "Sierra Leone",
            SM: "San Marino",
            SN: "Senegal",
            SO: "Somalia",
            SR: "Suriname",
            SS: "South Sudan",
            ST: "Sao Tome and Principe",
            SV: "El Salvador",
            SX: "Sint Maarten (Dutch part)",
            SY: "Syrian Arab Republic",
            SZ: "Swaziland",
            TC: "Turks and Caicos Islands",
            TD: "Chad",
            TF: "French Southern Territories",
            TG: "Togo",
            TH: "Thailand",
            TJ: "Tajikistan",
            TL: "Timor-Leste",
            TM: "Turkmenistan",
            TN: "Tunisia",
            TO: "Tonga",
            TR: "Turkey",
            TT: "Trinidad and Tobago",
            TW: "Taiwan, Province of China",
            TZ: "Tanzania, United Republic of",
            UA: "Ukraine",
            UG: "Uganda",
            US: "United States",
            UY: "Uruguay",
            UZ: "Uzbekistan",
            VC: "Saint Vincent and the Grenadines",
            VE: "Venezuela, Bolivarian Republic of",
            VG: "Virgin Islands, British",
            VI: "Virgin Islands, U.S.",
            VN: "Viet Nam",
            VU: "Vanuatu",
            WF: "Wallis and Futuna",
            WS: "Samoa",
            YE: "Yemen",
            ZA: "South Africa",
            ZM: "Zambia",
            ZW: "Zimbabwe",
            BO: "Bolivia",
            BN: "Brunei",
            CV: "Cabo Verde",
            CG: "Congo (Brazzaville)",
            CD: "Congo (Kinshasa)",
            CI: "Cote d'Ivoire",
            CZ: "Czechia",
            SZ: "Eswatini",
            VA: "Holy See",
            IR: "Iran",
            KR: "Korea, South",
            MD: "Moldova",
            MK: "North Macedonia",
            RU: "Russia",
            TW: "Taiwan*",
            TZ: "Tanzania",
            US: "US",
            VE: "Venezuela",
            VN: "Vietnam",
            SY: "Syria",
            LA: "Laos",
            PS: "West Bank and Gaza",
            MM: "Burma"
        }
        const nameToCode = {}
        for (let c in this.codeToName) {
            nameToCode[this.codeToName[c]] = c
        }
        this.nameToCode = nameToCode
    }
}

const dp = new DataProcessor()
export default dp