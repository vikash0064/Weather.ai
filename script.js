const apiKey = "43af129963409f04e04b77b37c668d43";
const apiUrl = "https://api.openweathermap.org/data/2.5/weather?units=metric&q=";
const geminiApiKey = "YOUR_GOOGLE_API_KEY"; // Yahan apna Google API key dalen

const searchBox = document.querySelector(".search input");
const searchBtn = document.querySelector(".search button");
const weatherIcon = document.querySelector(".weather-icon");
const bgVideo = document.getElementById("bgVideo");

// Enhanced city suggestions list
const knownCities = [
    "Delhi", "Mumbai", "Chennai", "Bangalore", "Kolkata", 
    "Hyderabad", "Pune", "Jaipur", "Ahmedabad", "Surat",
    "Lucknow", "Kanpur", "Nagpur", "Patna", "Indore",
    "Thane", "Bhopal", "Visakhapatnam", "Vadodara", "Agra"
];

// Weather to video mapping
const weatherVideos = {
    "Clear": "video/clear.mp4",
    "Clouds": "video/cloud.mp4",
    "Rain": "video/rain.mp4",
    "Drizzle": "video/drizzle.mp4",
    "Thunderstorm": "video/thunderstorm.mp4",
    "Snow": "video/snow.mp4",
    "Mist": "video/mist.mp4",
    "Fog": "video/fog.mp4",
    "default": "video/default.mp4"
};

// Create suggestions container
const suggestionsContainer = document.createElement("div");
suggestionsContainer.className = "suggestions-container";
document.querySelector(".search").appendChild(suggestionsContainer);

async function checkWeather(city) {
    try {
        const response = await fetch(apiUrl + city + `&appid=${apiKey}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const data = await response.json();
        console.log("🌤️ Weather Data:", data);

        document.querySelector(".city").innerHTML = data.name;
        document.querySelector(".temp").innerHTML = Math.round(data.main.temp) + "°c";
        document.querySelector(".humidity").innerHTML = data.main.humidity + "%";
        document.querySelector(".wind").innerHTML = data.wind.speed + " km/h";

        const condition = data.weather[0].main;

        // Update weather icon
        const weatherIcons = {
            "Clouds": "image/clouds.png",
            "Clear": "image/clear.png",
            "Rain": "image/rain.png",
            "Drizzle": "image/drizzle.png",
            "Mist": "image/mist.png"
        };
        weatherIcon.src = weatherIcons[condition] || "default.png";

        // Update background video
        const videoFile = weatherVideos[condition] || weatherVideos["default"];
        if (!bgVideo.src.includes(videoFile)) {
            bgVideo.src = videoFile;
            bgVideo.load();
            bgVideo.play().catch(e => console.log("Autoplay prevented:", e));
        }

        await getAISuggestion(data);

    } catch (error) {
        console.error("Error fetching weather data:", error);
        alert("❌ City not found or API error");
        document.getElementById("aiSuggestion").innerText = "⚠️ Weather data unavailable. Please try another city.";
        // Set default video on error
        bgVideo.src = weatherVideos["default"];
        bgVideo.load();
    }
}

async function getAISuggestion(weatherData) {
    const city = weatherData.name;
    const temperature = Math.round(weatherData.main.temp);
    const condition = weatherData.weather[0].main;
    const humidity = weatherData.main.humidity;
    const wind = weatherData.wind.speed;

    document.getElementById("aiSuggestion").innerText = "⏳ AI thinking...";

    try {
        const prompt = `
You are a helpful AI weather assistant for India. 
Give ONE friendly, practical tip in Hindi/English mix (Hinglish) about today's weather in ${city}.

Current conditions:
- Temperature: ${temperature}°C
- Weather: ${condition}
- Humidity: ${humidity}%
- Wind: ${wind} km/h

Make it short (max 15 words), practical and culturally relevant for Indians.
Examples:
"Bahar garmi hai, paani ki botal sath le jana!"
"Barish ho sakti hai, umbrella leke jana bhoolna mat!"
"Thand hai, sweater pehen ke niklo."
`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            }
        );

        if (!response.ok) throw new Error(`API error! Status: ${response.status}`);

        const result = await response.json();
        console.log("🤖 Gemini API Response:", result);

        let suggestionText = "Enjoy your day!";
        
        if (result?.candidates?.[0]?.content?.parts?.[0]?.text) {
            suggestionText = result.candidates[0].content.parts[0].text;
        } else if (result?.candidates?.[0]?.content?.text) {
            suggestionText = result.candidates[0].content.text;
        }

        suggestionText = suggestionText.replace(/[*#\-]/g, '').trim();
        
        document.getElementById("aiSuggestion").innerText = "🤖 " + suggestionText;

    } catch (error) {
        console.error("❌ Gemini API error:", error);
        getLocalSuggestion(weatherData);
    }
}

// Fallback local suggestions
function getLocalSuggestion(weatherData) {
    const temperature = Math.round(weatherData.main.temp);
    const condition = weatherData.weather[0].main;

    const suggestions = {
        Rain: "Barish ho rahi hai, umbrella leke jana! ☔",
        Drizzle: "Halki barish ho sakti hai, raincoat ready rakho.",
        Clear: temperature > 30 
            ? "Bahar bahut garmi hai, sunscreen lagana na bhoolen! ☀️" 
            : "Suraj nikla hai, bahar jakar enjoy karo!",
        Clouds: "Badal chhaye hain, lekin barish ki sambhavana kam hai.",
        Mist: "Dhund hai, driving karte waqt dhyaan rakhna.",
        default: "Aaj ka mausam acha hai, enjoy karo!"
    };

    const suggestion = suggestions[condition] || suggestions.default;
    document.getElementById("aiSuggestion").innerText = "🤖 " + suggestion;
}

// Function to show city suggestions
function showSuggestions(input) {
    suggestionsContainer.innerHTML = "";
    
    if (!input || input.length < 2) {
        suggestionsContainer.style.display = "none";
        return;
    }
    
    const lowerInput = input.toLowerCase();
    const matches = knownCities.filter(city => 
        city.toLowerCase().includes(lowerInput)
    ).slice(0, 5); // Show max 5 suggestions
    
    if (matches.length > 0) {
        matches.forEach(city => {
            const suggestion = document.createElement("div");
            suggestion.className = "suggestion";
            suggestion.textContent = city;
            suggestion.addEventListener("click", () => {
                searchBox.value = city;
                suggestionsContainer.style.display = "none";
                checkWeather(city);
            });
            suggestionsContainer.appendChild(suggestion);
        });
        suggestionsContainer.style.display = "block";
    } else {
        suggestionsContainer.style.display = "none";
    }
}

// Event listeners
searchBox.addEventListener("input", () => {
    showSuggestions(searchBox.value.trim());
});

searchBox.addEventListener("focus", () => {
    if (searchBox.value.trim().length >= 2) {
        showSuggestions(searchBox.value.trim());
    }
});

document.addEventListener("click", (e) => {
    if (!e.target.closest(".search")) {
        suggestionsContainer.style.display = "none";
    }
});

searchBtn.addEventListener("click", () => {
    const city = searchBox.value.trim();
    if (city !== "") {
        checkWeather(city);
        suggestionsContainer.style.display = "none";
    } else {
        alert("Please enter a city");
    }
});

searchBox.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        const city = searchBox.value.trim();
        if (city !== "") {
            checkWeather(city);
            suggestionsContainer.style.display = "none";
        }
    }
});

// Initialize with default city and video
checkWeather("Delhi");
bgVideo.src = weatherVideos["default"];
bgVideo.load();