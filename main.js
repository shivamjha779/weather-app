const API_KEY= "877d04028bb9ef02acb45638b86cfbfc";
const DAYS_OF_THE_WEEK = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
let selectedCityText;
let selectedCity;
const getCitiesUsingGeoLocation = async(searchText)=> {
    const response = await fetch(`http://api.openweathermap.org/geo/1.0/direct?q=${searchText}&limit=5&appid=${API_KEY}`);
    return response.json();
}

const getCurrentWeatherData = async({lat, lon, name: city})=> {
   const url = lat && lon? `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric` : `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`
    const response = await fetch(url);
    return response.json();
}
const getHourlyForcast = async ({name: city}) => {
    const response= await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`);
    const data = await response.json();
    return data.list.map(forecast=> {
        const { main: { temp, temp_max, temp_min}, dt, dt_txt, weather : [{description, icon}]}= forecast;
        return {temp, temp_max, temp_min, dt, dt_txt, description, icon};

    })


}

const formatTemprature= (temp) => `${temp?.toFixed(1)}°`;
const createiconUrl = (icon) => `http://openweathermap.org/img/wn/${icon}@2x.png`;


const loadcurrentforcast = ({ name, main:{temp, temp_max, temp_min}, weather:[{description}]})=> {
    const currentforcastElement= document.querySelector("#current-forcast");
    currentforcastElement.querySelector(".city").textContent= name;
    currentforcastElement.querySelector(".temp").textContent= formatTemprature(temp);
    currentforcastElement.querySelector(".desc").textContent= description;
    currentforcastElement.querySelector(".high-low").textContent=`H: ${formatTemprature(temp_max)} L: ${formatTemprature(temp_min)}`;


}
const loadHourlyForcast = ({main: {temp: tempNow}, weather:[{icon: iconNow}]},HourlyForcast)=> {
    let dataFor12Hour = HourlyForcast.slice(2, 14);
    const timeFormatter = Intl.DateTimeFormat("en", {hour12: true, hour: "numeric"});
    const HourlyContainer = document.querySelector(".hourly-container");
    let innerHTMLSting = `<article>
    <h3 class="time">Now</h3>
    <img class="icon" src="${createiconUrl(iconNow)}" />
    <p class="hourly-temp">${formatTemprature(tempNow)}</p>
  </article>`;


    for(let {temp, icon, dt_txt} of dataFor12Hour) {
        innerHTMLSting += `<article>
        <h3 class="time">${timeFormatter.format(new Date(dt_txt))}</h3>
        <img class="icon" src="${createiconUrl(icon)}" />
        <p class="hourly-temp">${formatTemprature(temp)}</p>
      </article>`

    }
    HourlyContainer.innerHTML = innerHTMLSting;

}
const calculateDayWiseForecast = (HourlyForcast) => {
    let dayWiseForecast = new Map();
    for(let forcast of HourlyForcast) 
    {
        const [date] = forcast.dt_txt.split(" ");
        const dayoftheweek = DAYS_OF_THE_WEEK[new Date(date).getDay()];
        console.log(dayoftheweek);
        if(dayWiseForecast.has(dayoftheweek)) {
            let forecastOFTheDay = dayWiseForecast.get(dayoftheweek);
            forecastOFTheDay.push(forcast);
            dayWiseForecast.set(dayoftheweek, forecastOFTheDay);

        } else {
            dayWiseForecast.set(dayoftheweek, [forcast]);
        }
    }
    console.log(dayWiseForecast);
    for(let [key, value] of dayWiseForecast)
    {
        let temp_min = Math.min(...Array.from(value, val=> val.temp_min));
        let temp_max = Math.max(...Array.from(value, val=> val.temp_max));
        dayWiseForecast.set(key, {temp_min, temp_max, icon: value.find(v=> v.icon).icon});
    }
    return dayWiseForecast;
   
}
const loadFiveDayForecast = (HourlyForcast) => {
    const dayWiseForecast = calculateDayWiseForecast(HourlyForcast);
    const container = document.querySelector(".five-day-forecast-container");
    let dayWiseInfo="";
    Array.from(dayWiseForecast).map(([day, {temp_min, temp_max, icon}], index)=> {
        if(index<5) {
        dayWiseInfo += `<article class="day-wise-forecast">
        <h3 class="day" >${index==0? "Today": day}</h3>
        <img class="icon" src="${createiconUrl(icon)}" alt="icon for the forecast" />
        <p class="min-temp">${formatTemprature(temp_min)}</p>
        <p class="max-temp">${formatTemprature(temp_max)}</p>
      </article>`;
        }

    });
    container.innerHTML= dayWiseInfo;

}

const loadFeelsLike = ({main: {feels_like}})=> {
    let container = document.querySelector("#feels-like-forecast");
    container.querySelector(".feels-like-temp").textContent = formatTemprature(feels_like);

}
const loadHumidity = ({main: {humidity}})=> {
    let container = document.querySelector("#humidity-forecast");
    container.querySelector(".humidity-value").textContent = `${humidity}%`;

}
function debounce(func) {
    let timer;
    return (...args)=> {
        clearTimeout(timer);
        timer = setTimeout(()=>{
            func.apply(this, args)
        }, 500);

    }

}
const loadForecastUsingGeoLocation = () => {
    navigator.geolocation.getCurrentPosition(({coords})=>{
        const {latitude: lat, longitude: lon} = coords;
        selectedCity= {lat, lon};
        loadData();
    }, error=> console.log(error))
}




const loadData = async()=> {
    const currentWeather= await getCurrentWeatherData(selectedCity);
   loadcurrentforcast(currentWeather);
   const HourlyForcast= await getHourlyForcast(currentWeather);
   loadHourlyForcast(currentWeather, HourlyForcast);
   loadFiveDayForecast(HourlyForcast);
   loadFeelsLike(currentWeather);
   loadHumidity(currentWeather);

}
const debounceSearch = debounce((event)=>onSearchChange(event));

const onSearchChange = async (event)=> {
    let {value} =event.target;
    if(!value) {
        selectedCity= null;
        selectedCityText = "";
    }
    if(value && (selectedCityText !== value)) {
        const listOfCities = await getCitiesUsingGeoLocation(value);
    let options = "";
    for(let {lat, lon, name, state, country} of listOfCities) {
       options += `<option data-city-details='${JSON.stringify({lat, lon, name})}' value="${name}, ${state}, ${country}"></option>`;

    }
    document.querySelector("#cities").innerHTML = options;
  

    }
    
}
const handleCitySelection = (event)=> {
     selectedCityText = event.target.value;
     let options = document.querySelectorAll("#cities > option");
     if(options?.length) {
          let selectedOption = Array.from(options).find(opt=> opt.value === selectedCityText);
          selectedCity = JSON.parse(selectedOption.getAttribute("data-city-details"));
          loadData();
     }
}


document.addEventListener("DOMContentLoaded", async ()=> {
    loadForecastUsingGeoLocation();
    const searchInput = document.querySelector("#search");
    searchInput.addEventListener("input", debounceSearch);
    searchInput.addEventListener("change", handleCitySelection);
   

})