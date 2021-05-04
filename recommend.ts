const { Client } = require("@googlemaps/google-maps-services-js");
const { WebClient } = require('@slack/web-api');
require('dotenv').config();

const client = new Client({});
const API_KEY = process.env.GOOGLE_MAPS_API_KEY
const LOCATION = eval(process.env.LOCATION)
const PAGE_NUM = 1

const slack = new WebClient(process.env.SLACK_ACCESS_TOKEN);


// const SEARCH_OPEN_NOW = false
const SEARCH_OPEN_NOW = false
console.log('Searching Restaurants...');

export async function recommendRestaurant () {
  let restaurants = []
  let response = null
  for (let pageIdx of [...Array(PAGE_NUM).keys()]) {
    let params: any
    if (!response) {
      params = {
        location: LOCATION,
        radius: 1000,
        type: 'restaurant',
        language: 'ja',
        maxprice: 3,
      }
      if (SEARCH_OPEN_NOW) {
        params.opennow = true
      }
    } else {
      await new Promise((r) => setTimeout(r, 2000))
      params = {
        pagetoken: response.data.next_page_token
      }
    }
    console.log(params)
    params.key = API_KEY

    try {
      response = await client.placesNearby({
        // https://github.com/googlemaps/google-maps-services-js/blob/master/src/places/placesnearby.ts
        params,
        timeout: 1000, // milliseconds
      })
    } catch (e) {
      console.error(e.response.status);
      // console.error(e.response);
      break
    }
    let { results } = response.data
    for (let result of results) {
      restaurants.push({
        name: result.name,
        rating: result.rating,
        user_ratings_total: result.user_ratings_total,
        // vicinity: result.vicinity,
        business_status: result.business_status,
        // LOCATION: result.LOCATION,
        opening_hours: result.opening_hours,
        place_id: result.place_id,
      })
    }
    if (!response.data.next_page_token) {
      console.log("No more restaurants")
      break
    }
  }
  console.table(restaurants)

  // Recommend restaurants
  let rc = restaurants[Math.floor(Math.random() * restaurants.length)];
  try {
    // https://github.com/googlemaps/google-maps-services-js/blob/master/src/places/details.ts
    response = await client.placeDetails({
      params: {
        place_id: rc.place_id,
        fields: ['url', 'opening_hours'],
        language: 'ja',
        key: API_KEY,
      },
      timeout: 1000, // milliseconds
    })
  } catch (e) {
    console.error(e.response);
  }

  try {
    const { url, opening_hours } = response.data.result
    const weekday = ['日曜', '月曜', '火曜', '水曜', '木曜', '金曜', '土曜'][(new Date()).getDay()]
    const weekday_text = opening_hours.weekday_text.filter(txt => txt.includes(weekday)).join('|') || (rc.opening_hours.open_now ? 'Open now' : 'Closed')
    const open_info = weekday_text
    // const open_info = rc.opening_hours.open_now ? 'Open now' : 'Closed'

    await slack.chat.postMessage({
      channel: process.env.SLACK_CHANNEL,
      // channel: '#kinshicho',
      text: `今日のおすすめは： <${url}|${rc.name}> ${rc.rating}☆/${rc.user_ratings_total}人 ${open_info}`,
    });
  } catch (error) {
    console.log(error);
  }
}