/*  clock */
const hours = document.querySelector('.hours');
const minutes = document.querySelector('.minutes');
const seconds = document.querySelector('.seconds');

clock = () => {
    let today = new Date();
    let h = (today.getHours() % 12) + today.getMinutes() / 59; // 22 % 12 = 10pm
    let m = today.getMinutes(); // 0 - 59
    let s = today.getSeconds(); // 0 - 59
  
    h *= 30; // 12 * 30 = 360deg
    m *= 6;
    s *= 6; // 60 * 6 = 360deg
  
    rotation(hours, h);
    rotation(minutes, m);
    rotation(seconds, s);
  
    // call every second
    setTimeout(clock, 500);
  }
  
  rotation = (target, val) => {
    target.style.transform =  `rotate(${val}deg)`;
  }
  
  window.onload = clock();