import _ from 'lodash';
import './style.css';

// closing elemnt by X
// grouping comments by comments 
// click by mark opens same window with comments
// click on group, carusel of comments
// click by address opens from window
// unzoom grouping marks

let myMap,
    commentsHash = {};
let balloon = document.querySelector('.baloon');
let balloonHeader = document.querySelector('.baloon-header');
let commentList = document.querySelector('.comments-list');





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
    divAddress.innerHTML =  `<h4>${address}</h4>`;
    balloon.id = id;    
    balloon.style.zIndex = "2018";
    // let form = document.getElementById('comments-form');
    let commentList = document.querySelector('.comments-list');
    commentList.innerHTML = '';
    if (comments) {
        for (let comment of comments) {
            // let li = document.createElement('li');    
            // li.textContent = comment;
            // commentList.appendChild(li);
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

//add placemarks




// map creation

ymaps.ready(() => {     
        // create map
    myMap = new ymaps.Map ("map", {
        center: [55.7595946764199,37.639345541000345],
        zoom: 18
    });
    let clusterer = new ymaps.Clusterer({ clusterDisableClickZoom: true });
    let objects = [];

        // create elemnt by click
    myMap.events.add('click', function (e) {
        balloon.style.zIndex = "0";
        const coords = e.get('coords');   
            (async () => {
                try {
                    let {geoObjects} = await ymaps.geocode(coords);
                    let address = geoObjects.get(0).getAddressLine();
                    let data = await getLLc(address);
                    localStorage.data = JSON.stringify(data);
                    
                    let {features} = data;
                    var placeList = new ymaps.control.ListBox({  //TODO: change to div
                        data: {
                            content: 'Select a BAR'
                        },
                        items: [],
                        float: 'none'
                    });
                    // myMap.controls.remove(placeList);  //TODO: remove controls                                                
                    for (let i = 0; i < features.length; i++) {   
                        let companyData = features[i].properties.CompanyMetaData;
                        let companyCoords = features[i].geometry.coordinates.reverse();
                        let {id} = companyData;
                        commentsHash[id] = companyData;
                        commentsHash[id].coords = companyCoords;
                        placeList.add(new ymaps.control.ListBoxItem(companyData.name)); //create controls
                        
                        placeList.get(i).events.add('click',  () => { // click event on controls
                            renderBaloon(companyData); // render empty
                            myMap.setCenter(companyCoords, 18);                            
                        });
                    }
                    let form = document.querySelector('#comments-form');
                    form.button.addEventListener('click', e => { //click event on form
                        let id = form.parentNode.id;                                                                                             
                        e.preventDefault();
                        console.log(id);                        
                        commentSave(id);
                        renderBaloon(commentsHash[id]); // render with
                        let placeMark = new ymaps.Placemark(commentsHash[id].coords);
                        placeMark.events.add('click', e => {
                            console.log(e);
                            renderBaloon(commentsHash[id]);
                        });
                        objects.push(placeMark)
                        clusterer.add(objects);  
                        myMap.geoObjects.add(clusterer);
                                                      
                    });
                    // console.log(commentsHash);
                    myMap.controls.add(placeList);
                    placeList.state.set('expanded', true);
                    } catch (e) {
                        console.error(e);
                    }
                })();
    });        
})


