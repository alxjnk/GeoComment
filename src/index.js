import _ from 'lodash';
import './style.css';




let myMap,
    commentsHash = {},
    placeList;
let balloon = document.querySelector('.baloon');
let balloonHeader = document.querySelector('.baloon-header');
let balloonFooter = document.querySelector('.baloon-footer');
let balloonContent = document.querySelector('.baloon-content');
let closeButton = document.querySelector('.close');
let comment = document.querySelector('.comment');
let left = document.querySelector('.left');
let right = document.querySelector('.right');
let nav = document.createElement('div');


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

function renderBaloon(data, items) { //TODO: unpack features
    let form = document.querySelector('#comments-form');   
    let { id, name, address, comments } = data;
    let divName = document.querySelector('.baloon-header-name');
    let divAddress = document.querySelector('.baloon-header-address');
    divName.innerHTML = `<h3>${name}</h3>`;
    divAddress.innerHTML =  `<p>${address}</p>`;
    balloon.id = id;    
    balloon.style.zIndex = "2018";
    balloon.style.display = "block";
    nav.className = "baloon-navigation";
    if (items) {
        form.style.display = "none";
        comment.style.display = "block";
        left.style.display ='block';
        right.style.display ='block';        
        balloonContent.innerHTML = '';
        for (let el of data.Features) {    //"TODO: get some features here
            if(el.value) {
                balloonContent.innerHTML = balloonContent.innerHTML + `<li>${el.name} ${el.value}</li>`;
            } else if(el.values) {
                for (let val of el.values) {
                    balloonContent.innerHTML = balloonContent.innerHTML + `<li>${el.name} ${val.value}</li>`;
                }

            }
        }
        comment.addEventListener('click', () => {  //open baloon for comments
            renderBaloon(data);
        });
        if(nav.childNodes.length > 0) return;
        for (let i = 0; i < items.length; i++) {
            let a = document.createElement('a');
            a.textContent = i;
            a.addEventListener('click', e => { //slider navigation
                renderBaloon(commentsHash[items[i].id], items);
            });
            a.href = '#';
            nav.appendChild(a);
        }
        balloonFooter.appendChild(nav);
        
    } else {
        comment.style.display = 'none';
        left.style.display ='none';
        right.style.display ='none';        
        form.style.display = 'block';
        balloonContent.innerHTML = '';
        if (comments) {
            for (let comment of comments) {
                balloonContent.innerHTML = balloonContent.innerHTML + comment;                
            } 
        } else {
            let li = document.createElement('li');    
            li.textContent = 'Отзывов пока нет..';   
            balloonContent.appendChild(li);                                  
            }
        form.firstname.value = '';
        form.comment.value = '';
    }
}

// data manipulation

function commentSave(id) {
    let form = document.querySelector('#comments-form');
    let name = document.querySelector('.baloon-header-name').textContent;
    let address = document.querySelector('.baloon-header-address').textContent;
    if(!commentsHash[id].comments) {
        commentsHash[id].comments = [];
    }
    let utc = new Date().toJSON().slice(0,10).replace(/-/g,'/');            
    if (!form.firstname.value || !form.comment.value) return;
    commentsHash[id].comments.push(`<li><b>${form.firstname.value}</b> <span>${utc}</span><br><br> ${form.comment.value}</li><br>`);                
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
                        let id = balloon.id;
                        e.preventDefault();
                        commentSave(id);
                        if (!form.comment.value) {
                            return;
                        } else {                        
                            renderBaloon(commentsHash[id]);
                        } 
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

                    myObjectManager.events.add('click', (e) => {
                        let id = e.get('objectId');
                        let objects = myObjectManager.clusters.overlays.getById(id)._data.features;
                        let items = objects.length;
                        let count = 0;
                        right.addEventListener('click', ()=> {
                            count++;
                            count = (count >= items) ? items - 1: count;
                            renderBaloon(commentsHash[objects[count].id], objects);                            
                        })
                        left.addEventListener('click', ()=> {
                            count--;
                            count = (count < 0) ? 0: count;
                            renderBaloon(commentsHash[objects[count].id], objects);                            
                        })
                        renderBaloon(commentsHash[objects[count].id], objects);
                        
                    });
                    

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


