import _ from 'lodash';
import './style.css';

let myMap,
    commentsHash = {},
    placeList;
let balloon = document.querySelector('.baloon');
let balloonHeader = document.querySelector('.baloon-header');
let commentList = document.querySelector('.comments-list');
let closeButton = document.querySelector('.close');

// data from yandex

function getAddressLine(coords) {
     return ymaps.geocode(coords);
}


function getLLc(address) {
    return fetch(encodeURI(`https://search-maps.yandex.ru/v1/?text=Еда, ${address}&spn=0.00000000001,0.000000000018&type=biz&lang=ru_RU&apikey=9977b6b1-f950-4987-9ff2-9bc41ae284d8&results=5`))
    .then(response => {
        return response.json();
       })
      .catch(e => console.error(e));
}

// data rendering

function renderBaloon(data) { //TODO: unpack features
    let form = document.querySelector('#comments-form');   
    let { id, name, address, comments } = data;
    console.log(data);
    let divName = document.querySelector('.baloon-header-name');
    let divAddress = document.querySelector('.baloon-header-address');
    divName.innerHTML = `<h3>${name}</h3>`;
    divAddress.innerHTML =  `<p>${address}<p>`;
    balloon.id = id;    
    balloon.style.zIndex = "2018";
    balloon.style.display = "block";
    let commentList = document.querySelector('.comments-list');
    commentList.innerHTML = '';
    if (comments) {
        for (let comment of comments) {
            commentList.innerHTML = commentList.innerHTML + comment;                
        } 
    } else {
        let li = document.createElement('li');    
        li.textContent = 'Пока нет отзывов';   
        commentList.appendChild(li);                                  
        }
    form.firstname.value = '';
    form.comment.value = '';


    // for (let el of companyData.Features) {    "TODO: get some features here
                            //     if(el.value) {
                            //         console.log(el.name, el.value);
                            //     } else if(el.values) {
                            //         for (let val of el.values) {
                            //             console.log(el.name, val.value);
                            //         }

                            //     }
                            // }
}

// data manipulation

function commentSave(id) {
    let form = document.querySelector('#comments-form');
    let name = document.querySelector('.baloon-header-name').textContent;
    let address = document.querySelector('.baloon-header-address').textContent;
    if(!commentsHash[id].comments) {
        commentsHash[id].comments = [];
    }
    if (!form.firstname.value || !form.comment.value) return;
    console.log(`<li>${form.firstname.value} сказал: ${form.comment.value}`);
    commentsHash[id].comments.push(`<li>${form.firstname.value} сказал: ${form.comment.value}`);                
}

// close baloons

closeButton.addEventListener('click', () => {
    balloon.style.zIndex = "0";
    myMap.controls.remove(placeList);        
});

// map creation

ymaps.ready(() => {     
    myMap = new ymaps.Map ("map", {
        center: [55.7595946764199,37.639345541000345],
        zoom: 18
    });
    let myObjectManager = new ymaps.ObjectManager({ 
        clusterize: true,
        clusterDisableClickZoom: true,
        clusterHasBalloon: false
    });

    myMap.events.add('click', function (e) {
        myMap.controls.remove(placeList);        
        balloon.style.zIndex = "0";
        const coords = e.get('coords');   
            (async () => {
                try {
                    let {geoObjects} = await ymaps.geocode(coords);
                    let address = geoObjects.get(0).getAddressLine();
                    let data = await getLLc(address);
                    localStorage.data = JSON.stringify(data);
                    
                    let {features} = data;
                    placeList = new ymaps.control.ListBox({  //TODO: change to div
                        data: {
                            content: 'Select a BAR'
                        },
                        items: [],
                        float: 'none'
                    });
                    for (let i = 0; i < features.length; i++) {   
                        let companyData = features[i].properties.CompanyMetaData;
                        let companyCoords = features[i].geometry.coordinates.reverse();
                        let {id} = companyData;

                        commentsHash[id] = (commentsHash[id]) ? commentsHash[id] : companyData;
                        commentsHash[id].coords = companyCoords;

                        placeList.add(new ymaps.control.ListBoxItem(companyData.name));

                        placeList.get(i).events.add('click',  () => { 
                            myMap.controls.remove(placeList);
                            if (myObjectManager.getObjectState(id).found) {
                                renderBaloon(commentsHash[id]); 
                            } else {
                                renderBaloon(companyData); 
                            }        
                            myMap.setCenter(companyCoords, 18);                            
                        });
                    }
                    let form = document.querySelector('#comments-form');
                    form.button.addEventListener('click', e => {
                        let id = form.parentNode.id;

                        e.preventDefault();
                        commentSave(id);
                        renderBaloon(commentsHash[id]); 
                        if (myObjectManager.getObjectState(id).found) return;
                        
                        myObjectManager.add({
                            type: 'Feature',
                            id: id,
                            geometry: {
                                type: 'Point',
                                coordinates: commentsHash[id].coords
                            },
                        });                           
                    });
                    myMap.geoObjects.add(myObjectManager);

                    myObjectManager.objects.events.add('click', e => {
                        let objectId = e.get('objectId');
                        renderBaloon(commentsHash[objectId]);                            
                    });

                    myMap.controls.add(placeList);
                    placeList.state.set('expanded', true);
                    } catch (e) {
                        console.error(e);
                    }
                })();
    });        
})


