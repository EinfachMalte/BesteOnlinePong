/*
p5.multiplayer - HOST

This 'host' sketch is intended to be run in desktop browsers. 
It connects to a node server via socket.io, from which it receives
rerouted input data from all connected 'clients'.
heroku plugins:install heroku-fork
Navigate to the project's 'public' directory.
Run http-server -c-1 to start server. This will default to port 8080.
Run http-server -c-1 -p80 to start server on open port 80.

*/

////////////
// Network Settings
// const serverIp      = 'https://yourservername.herokuapp.com';
// const serverIp      = 'https://yourprojectname.glitch.me';
const serverIp      = '127.0.0.1';
const serverPort    = '3000';
const local         = true;   // true if running locally, false
                              // if running on remote server

// Global variables here. ---->

let velScale	= 10;
const debug = true;
let game;
let loggedPlayers = 0;
let startTimerPlayer1 = false, startTimerPlayer2 = false;
let timerPlayer1 = 3, timerPlayer2 = 3;
let tagDiv;
// <----

function preload() {
  setupHost();
}

function setup () {
  createCanvas(windowWidth, windowHeight);

  // Host/Game setup here. ---->
  tagDiv = createDiv();
  // position it:
  tagDiv.position(130, 4);
  game = new Game(width, height);

  
  // <----
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw () {
  background(15);

  if(isHostConnected(display=true)) {
    // Host/Game draw here. --->

    // Display player IDs in top left corner
    game.printPlayerIds(5, 20);

    // Update and draw game objects
    game.draw();

    stroke(255, 255, 255);
    line(width / 4, 0, width / 4, height);
    line(width - width / 4, 0, width - width / 4, height);
    // <----

    // Display server address
    displayAddress();

    let qr = qrcode(0, 'L');
    qr.addData(getUrl());
    qr.make();
    // create an image from it:
    // paaramtetrs are cell size, margin size, and alt tag
    // cell size default: 2
    // margin zize defaault: 4 * cell size
    let qrImg = qr.createImgTag(3, 1, "qr code");
    // put the image into the HTML div:
    tagDiv.html(qrImg);
  }
}

let idPlayer1, idPlayer2;
function onClientConnect (data) {
  // Client connect logic here. --->
  console.log(data.id + ' has connected. lalalala');
  console.log(loggedPlayers);
  if (!game.checkId(data.id)) {
    if (loggedPlayers === 0) {
      idPlayer1 = data.id;
      loggedPlayers++;
      game.addBall(width / 2, height / 2, 10, "ball");
      game.add(idPlayer1,
              width / 12,
              height / 4,
              30, 120
      );
    } else if (loggedPlayers === 1) {
      idPlayer2 = data.id;
      loggedPlayers++;
      game.add(idPlayer2,
        width - (width / 12),
        height / 4,
        30, 120
      );
      game.setVelocity("ball", 2, 0);
    }
    
  }

  // <----
}

function onClientDisconnect (data) {
  // Client disconnect logic here. --->

  if (game.checkId(data.id)) {
    game.remove(data.id);
  }

  // <----
}

function onReceiveData (data) {
  // Input data processing here. --->
  console.log(data);

  if (data.type === 'joystick') {
    processJoystick(data);
  }
  else if (data.type === 'button') {
    processButton(data);
  }
  else if (data.type === 'playerColor') {
    game.setColor(data.id, data.r*255, data.g*255, data.b*255);
  }

  // <----

  /* Example:
     if (data.type === 'myDataType') {
       processMyData(data);
     }

     Use `data.type` to get the message type sent by client.
  */
}

// This is included for testing purposes to demonstrate that
// messages can be sent from a host back to all connected clients
function mousePressed() {
  sendData('timestamp', { timestamp: millis() });
}

////////////
// Input processing
function processJoystick (data) {
  if (data.id == idPlayer1) {
    if (game.players[idPlayer1].left && data.joystickX > 0) {
      game.setVelocity(data.id, data.joystickX*velScale, -data.joystickY*velScale);
    } else if (game.players[idPlayer1].right && data.joystickX < 0) {
      game.setVelocity(data.id, data.joystickX*velScale, -data.joystickY*velScale);
    } else if (game.players[idPlayer1].left == false && game.players[idPlayer1].right == false) {
      game.setVelocity(data.id, data.joystickX*velScale, -data.joystickY*velScale);
    }
    game.setVelocity(data.id, game.players[idPlayer1].velocity.x, -data.joystickY*velScale);
  } else if (data.id == idPlayer2) {
    if (game.players[idPlayer2].left && data.joystickX > 0) {
      console.log("test");
      game.setVelocity(data.id, data.joystickX*velScale, -data.joystickY*velScale);
    } else if (game.players[idPlayer2].right && data.joystickX < 0) {
      game.setVelocity(data.id, data.joystickX*velScale, -data.joystickY*velScale);
    } else if (game.players[idPlayer2].left == false && game.players[idPlayer2].right == false) {
      game.setVelocity(data.id, data.joystickX*velScale, -data.joystickY*velScale);
    }
    game.setVelocity(data.id, game.players[idPlayer2].velocity.x, -data.joystickY*velScale);
  }
  if (debug) {
    console.log(data.id + ': {' +
                data.joystickX + ',' +
                data.joystickY + '}');
  }
}

function processButton (data) {
  game.players[data.id].val = data.button;

  if (data.id == idPlayer1) {
    startTimerPlayer1 = true;
  } else if (data.id == idPlayer2) {
    startTimerPlayer2 = true;
  }
  
  if (debug) {
    console.log(data.id + ': ' +
                data.button);
  }
}

////////////
// Game
// This simple placeholder game makes use of p5.play
let velocityChange = 0;
let changed = false;
class Game {
  constructor (w, h) {
    this.w          = w;
    this.h          = h;
    this.players	= {};
    this.ball = {};
    this.numPlayers	= 0;
    this.id         = 0;
    this.colliders	= new Group();
    this.ripples    = new Ripples();
    this.left;
    this.right;
  }

  add(id, x, y, w, h) {
    this.players[id] = createSprite(x, y, w, h);
    this.players[id].id = id;
    this.players[id].setCollider("rectangle", 0, 0, w, h);
    this.players[id].color = color(255, 255, 255);
    this.players[id].shapeColor = color(255, 255, 255);
    this.players[id].scale = 1;
    this.players[id].mass = 1;
    this.players[id].left = false;
    this.players[id].right = false;
    this.colliders.add(this.players[id]);
    print(this.players[id].id + " added.");
    this.numPlayers++;
  }

  addBall(x, y, size, id) {
    this.ball[id] = createSprite(x, y, size, size);
    this.ball[id].setCollider("rectangle", 0, 0, size, size);
    this.ball[id].id = id;
    this.ball[id].scale = 1;
    this.ball[id].mass = 1;
    this.colliders.add(this.ball[id]);
    console.log("ball added: " + id);
  }

  draw() {
    this.checkBounds();
    this.printPlayerIds();
    this.ripples.draw();
    this.bounce();
    drawSprites();

    if (startTimerPlayer1) {
      velScale = 15;
      if (frameCount % 60 == 0) {
        console.log(timerPlayer1 + " Player 1");
        timerPlayer1--;
        this.createRipple(idPlayer1, 300, 1000);
      }
      if (timerPlayer1 <= 0) {
        startTimerPlayer1 = false;
        timerPlayer1 = 3;
        velScale = 10;
      }
    } else if (startTimerPlayer2) {
      if (frameCount % 60 == 0) {
        console.log(timerPlayer2 + " Player 2");
        timerPlayer2--;
      }
      if (timerPlayer2 <= 0) {
        startTimerPlayer2 = false;
        timerPlayer2 = 3;
      }
    }
  }

  createRipple(id, r, duration) {
    this.ripples.add(
      this.players[id].position.x, 
      this.players[id].position.y, 
      r, 
      duration, 
      this.players[id].color);
  }

  setColor (id, r, g, b) {
    this.players[id].color = color(r, g, b);
    this.players[id].shapeColor = color(r, g, b);

    print(this.players[id].id + " color added.");
  }

  remove (id) {
      this.colliders.remove(this.players[id]);
      this.players[id].remove();
      delete this.players[id];
      this.numPlayers--;
  }

  checkId (id) {
      if (id in this.players) { return true; }
      else { return false; }
  }

  printPlayerIds (x, y) {
      push();
          noStroke();
          fill(255);
          textSize(16);
          text("# players: " + this.numPlayers, x, y);

          y = y + 16;
          fill(200);
          for (let id in this.players) {
              text(this.players[id].id, x, y);
              y += 16;
          }

      pop();
  }

  setVelocity(id, velx, vely) {
    if (id == "ball"){
      this.ball[id].velocity.x = velx;
      this.ball[id].velocity.y = vely;
    } else {
      velocityChange = this.players[id].velocity.x;
      this.players[id].velocity.x = velx;
      this.players[id].velocity.y = vely;
    }
  }
// CHECK BOUNDS OF EVERY PLAYER
  checkBounds() {
    let id;
    for (id in this.players) {
      if (id == idPlayer1) {
        if (this.players[id].position.x - 30 < 0) {
            this.players[id].velocity.x = 0;
            //this.players[id].velocity.y = 0;
            this.players[id].left = true;
        } else {
          this.players[id].left = false;
        }

        if (this.players[id].position.x + 30 > width / 4) {
          this.players[id].velocity.x = 0;
          //this.players[id].velocity.y = 0;
          this.players[id].right = true;
        } else {
          this.players[id].right = false;
        }
        // Oben und Unten
        if (this.players[id].position.y < 0) {
            this.players[id].position.y = this.h - 1;
        }

        if (this.players[id].position.y > this.h) {
            this.players[id].position.y = 1;
        }
      } else if (id == idPlayer2) {
        if (this.players[id].position.x - 30 < width- width / 4) {
          this.players[id].velocity.x = 0;
         /// this.players[id].velocity.y = 0;
          this.players[id].left = true;
        } else {
          this.players[id].left = false;
        }

        if (this.players[id].position.x + 30 > width) {
          this.players[id].velocity.x = 0;
          this.players[id].right = true;
        } else {
          this.players[id].right = false;
        }
        // Oben und Unten
        if (this.players[id].position.y < 0) {
            this.players[id].position.y = this.h - 1;
        }

        if (this.players[id].position.y > this.h) {
            this.players[id].position.y = 1;
        }
      }
    } 
  }

  bounce () {
    let buffer = true;
    // TODO: ball muss am rand abprallen
    for (let id in this.players) {
      if (this.ball["ball"].position.y + 10 >= height && buffer || this.ball["ball"].position.y - 10 <= 0 && buffer) {
        this.setVelocity("ball", this.ball["ball"].velocity.x, this.ball["ball"].velocity.y * -1);
        buffer = false;
      } else {
        buffer = true;
      }
      if (id == idPlayer1) {
        if (this.ball["ball"].position.x + 10 <= this.players[id].position.x + 30) {
          if (this.ball["ball"].position.y > this.players[id].position.y - 60 && this.ball["ball"].position.y < this.players[id].position.y + 60) {
            let difference = (this.ball["ball"].position.y - this.players[id].position.y) * 0.1;
            this.setVelocity("ball", this.ball["ball"].velocity.x * -1, difference);
          } else {
            this.setVelocity("ball", this.ball["ball"].velocity.x, this.ball["ball"].velocity.y);
          }
        }
      } else if (id == idPlayer2) {
        if (this.ball["ball"].position.x + 10 >= this.players[id].position.x - 15) {
          if (this.ball["ball"].position.y > this.players[id].position.y - 60 && this.ball["ball"].position.y < this.players[id].position.y + 60) {
            let difference = (this.ball["ball"].position.y - this.players[id].position.y) * 0.1;
            this.setVelocity("ball", this.ball["ball"].velocity.x * -1, difference);
          } else {
            this.setVelocity("ball", this.ball["ball"].velocity.x, this.ball["ball"].velocity.y);
          }
        }
      }
    }

    //const bounce = (p5: p5Types) => {
   // if (yBall > yPlayer && yBall < yPlayer + 60 && xBall + ballSize <= xPlayer + widthPlayer * 2) {
      //xBallspeed *= -1;
     //     yBallspeed = (yBall-yPlayer) * 0.05;
     //     xBallspeed += 1;
     // }  else if (yBall > yPlayer2 && yBall < yPlayer2 + 60 && xBall + ballSize * 2 >= xPlayer2 + widthPlayer * 2) {
     //     xBallspeed *= -1;
     //     yBallspeed = (yBall-yPlayer2) * 0.05;
     //     xBallspeed += 1;
     // }
  //}
  }
}

// A simple pair of classes for generating ripples
class Ripples {
  constructor() {
    this.ripples = [];
  }

  add(x, y, r, duration, rcolor) {
    this.ripples.push(new Ripple(x, y, r, duration, rcolor));
  }

  draw() {
    for (let i = 0; i < this.ripples.length; i++) {
      // Draw each ripple in the array
      if(this.ripples[i].draw()) {
        // If the ripple is finished (returns true), remove it
        this.ripples.splice(i, 1);
      }
    }
  }
}

class Ripple {
  constructor(x, y, r, duration, rcolor) {
    this.x = x;
    this.y = y;
    this.r = r;

    // If rcolor is not defined, default to white
    if (rcolor == null) {
      rcolor = color(255);
    }

    this.stroke = rcolor;
    this.strokeWeight = 3;

    this.duration = duration;   // in milliseconds
    this.startTime = millis();
    this.endTime = this.startTime + this.duration;
  }

  draw() {
    let progress = (this.endTime - millis())/this.duration;
    let r = this.r*(1 - progress);

    push();
      stroke(red(this.stroke), 
             green(this.stroke), 
             blue(this.stroke), 
             255*progress);
      strokeWeight(this.strokeWeight);
      fill(0, 0);
      ellipse(this.x, this.y, r);
    pop();

    if (millis() > this.endTime) {
      return true;
    }

    return false;
  }
}