const CLIENT_ID = "00448fd615854e9bb62fa8c99f25d34c";
const CLIENT_SECRET = "4f96d0a0236c466c8ec608daf936c518";
const REDIRECT_URI = "https://chaotic-braindead.github.io/SpotifyAPI/callback.html";
const SCOPES = [
    'user-read-currently-playing',
    'playlist-read-collaborative',
    'playlist-read-private',
    'user-library-read',
    'user-top-read',
    'user-read-recently-played',
    'user-read-playback-state'
];
const base = btoa(CLIENT_ID + ':' + CLIENT_SECRET);
const resp = 'code';

const YTCLIENT_ID = "1068017620543-38eau8jia2c7lql1enb8ksf3gg0be40r.apps.googleusercontent.com";
const YTCLIENT_SECRET = "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";
const ytScope = "https://www.googleapis.com/auth/youtube.force-ssl";
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest']
const link = document.getElementById('link');

// YOUTUBE

function handleClientLoad() {
    window.gapi.load('client:auth2', initClient);
}

function initClient(){
    window.gapi.client.init({
        clientId : YTCLIENT_ID,
        scope : ytScope,
        plugin_name:"SpotiFind",
        discoveryDocs: DISCOVERY_DOCS
    }).then(() => {
        window.gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
        updateSigninStatus(window.gapi.auth2.getAuthInstance().isSignedIn.get());
        link.onclick = handleAuthClick;
    });
}

function test(){
    console.log("here");
}
function updateSigninStatus(isSignedIn){
    if(isSignedIn){
        link.textContent = "YouTube Account Already Linked";
        link.disabled = true;
    }
    else{
        link.textContent = "Link YouTube Account";
        link.disabled = false;
    }
}

function handleAuthClick(){
    window.gapi.auth2.getAuthInstance().signIn();
}

function handleSignoutClick(){
    window.gapi.auth2.getAuthInstance().signOut();
}

function getPlaylists(){
    window.gapi.client.youtube.playlists.list({
        "part" : 'snippet,contentDetails,id',
        "mine" : true
    })
    .then(response => {console.log(response);})
    .catch(err => alert("No playlists"));
}

class Spotify{

    redirect() {
        window.location.href = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=${resp}&scope=${SCOPES.join("%20")}&redirect_uri=${REDIRECT_URI}`;
    }
    async get(token, endpoint){
        if(!(endpoint.includes("https://api.spotify.com/v1/"))){
            endpoint = "https://api.spotify.com/v1/" + endpoint;
        }
        const res = await fetch(endpoint, { 
            method: 'GET',
            headers: { 'Authorization' : 'Bearer ' + token,
                       'Content-Type' : 'application/json'
            }
        });
        if(res.status > 200){
            return null;
        }
        const data = await res.json();
        console.log(data);
        return data;
    }
    async auth(code){
        const res = await fetch('https://accounts.spotify.com/api/token',  { 
                method: 'POST',
                headers: {
                    'Content-Type' : 'application/x-www-form-urlencoded',
                    'Authorization' : 'Basic ' + base
                },
                body: `grant_type=authorization_code&code=${code}&redirect_uri=${REDIRECT_URI}`
            });
        const data = await res.json();
        console.log(data);
        let date = new Date();
        let now = date.getTime();
        localStorage.setItem('expiration', now + (data.expires_in * 1000));
        localStorage.setItem('access_token', data.access_token);
    }
};

async function onLoad(){
    const url = new URLSearchParams(window.location.search);
    const code = url.get('code');
    localStorage.setItem('code', code);
    await spoti.auth(code);
    home();
}

async function home(arg=false){
    let access_token = localStorage.getItem('access_token');
    if(arg)
        access_token = "0";
    
    let expiration = +localStorage.getItem('expiration');
    
    let dash = document.getElementById('dashboard');
    let loginBtn = document.getElementById('login-button');
    let logoutBtn = document.getElementById('logout-button');

    let date = new Date();
    let now = date.getTime();

    if (access_token !== "0"){    
        const data = await spoti.get(access_token, 'me');
         if(data.status === 200);
            dash.textContent = data.display_name;
        loginBtn.style.display = 'none';
    }
    else{
        localStorage.setItem('access_token', "0");
        logoutBtn.style.display = 'none';
        dash.style.display = 'none';
    }
    
    if(typeof expiration === "number" && now > expiration){
        spoti.auth(localStorage.getItem('code'));
    }  
   
    
}

function login(){
    const spoti = new Spotify();
    spoti.redirect();
}

async function dashboard(){
    home();
    let access_token = localStorage.getItem('access_token');
    let j = document.getElementById('user');
    let container = document.querySelector('.img-container');
    const data = await spoti.get(access_token, 'me');
    j.textContent = `${data.display_name} (${data.id})`;
    let img = document.createElement('img');
    img.src = data.images[0].url
    container.appendChild(img);

    let current = document.getElementById('current');
    const to = await spoti.get(access_token, 'me/player');
    if(to !== null && to.is_playing){
        let artists = [];
        for(let i = 0; i < to.item.artists.length; i++){
            artists.push(to.item.artists[i].name);
        }
        current.textContent = "Listening to: " + artists.join(", ") + " - " + to.item.name;
    }
}

async function playlist(){
    home();
    let access_token = localStorage.getItem('access_token');
    const data = await spoti.get(access_token, 'me/playlists');
    let select = document.querySelector('select');
    Object.values(data.items).map((item) => {
        if(item.owner.display_name !== "Spotify"){
            let option = document.createElement('option');
            option.value = item.tracks.href;
            option.textContent = item.name;
            select.appendChild(option);
        }
    })
}

async function submit(){
    let access_token = localStorage.getItem('access_token');
    let select = document.querySelector('select');
    let submit = document.getElementById('submit');
    let back = document.getElementById('back');
    let container = document.querySelector('.container');
    let user = document.getElementById('user');
    const songs = await spoti.get(access_token, select.value);
    const start = songs.href.indexOf('playlists') + 10;
    const end = start + 22;
    const title = await spoti.get(access_token, 'playlists/'+ songs.href.substring(start, end))
    user.textContent = title.name;
    select.style.display = 'none';
    submit.style.display = 'none';
    for(let i = 0; i < songs.items.length; i++){
        let div = document.createElement('div');
        let img = document.createElement('img');
        div.id = "song-container";
        div.style.display = "flex";
        img.id = "album";
        img.src = songs.items[i].track.album.images[0].url;
        div.appendChild(img);
        div.style.color = "white";
        let artists = [];
        for(let j = 0; j < songs.items[i].track.artists.length; j++){
            artists.push(songs.items[i].track.artists[j].name);
        }
        div.innerHTML += `
        <span id="span">
        <h2><a id="open" href="${songs.items[i].track.external_urls.spotify}">${songs.items[i].track.name}</a></h2>
        <h3>${artists.join(", ")}</h3>
        <h4>${songs.items[i].track.album.name}</h4>
        </span>`;
        container.appendChild(div);
    }
    back.href = 'playlists.html'
}

async function showArtists(){
    home();
    let access_token = localStorage.getItem('access_token');
    let container = document.querySelector('.container');
    const data = await spoti.get(access_token, 'me/top/artists?limit=10');
    for(let i = 0; i < data.items.length; i++){
        let div = document.createElement('div');
        let img = document.createElement('img');
        div.id = "song-container";
        div.style.display = "flex";
        img.src = data.items[i].images[0].url;
        div.appendChild(img);
        div.style.color = "white";
        let genres = data.items[i].genres.join(", ");
        div.innerHTML += `
        <span id="span">
            <h2><a id="open" href="${data.items[i].external_urls.spotify}">${data.items[i].name}</a></h2>
            <h3>${genres}</h3>
            <h4>${data.items[i].followers.total.toLocaleString()} followers</h4>
        </span>`;
        container.appendChild(div);
    }
}

async function showTopTracks(){
    home();
    let access_token = localStorage.getItem('access_token');
    let container = document.querySelector('.container');
    const data = await spoti.get(access_token, 'me/top/tracks?limit=10');
    for(let i = 0; i < data.items.length; i++){
        let div = document.createElement('div');
        let img = document.createElement('img');
        div.id = "song-container";
        div.style.display = "flex";
        img.id = "album";
        img.src = data.items[i].album.images[0].url;
        div.appendChild(img);
        div.style.color = "white";
        let artists = [];
        for(let j = 0; j < data.items[i].artists.length; j++){
            artists.push(data.items[i].artists[j].name);
        }
        div.innerHTML += `
        <span id="span">
            <h2><a id="open" href="${data.items[i].external_urls.spotify}">${data.items[i].name}</a></h2>
            <h3>${artists.join(", ")}</h3>
            <h4>${data.items[i].album.name}</h4>
        </span>`;
        container.appendChild(div);
    }

}
function logout(){
    home();
    localStorage.setItem('access_token', "0");
    localStorage.setItem('expiration', NaN);
    localStorage.setItem('code', "0");
    window.location.href = 'https://chaotic-braindead.github.io/SpotifyAPI/index.html';
}

let spoti = new Spotify();
