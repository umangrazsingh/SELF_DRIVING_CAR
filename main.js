const carCanvas=document.getElementById("carCanvas");
carCanvas.width=200;
const networkCanvas=document.getElementById("networkCanvas");
networkCanvas.width=300;

const carCtx = carCanvas.getContext("2d");
const networkCtx = networkCanvas.getContext("2d");
const road=new Road(carCanvas.width/2,carCanvas.width*0.9);

const N=100;
const cars=generateCars(N);
let bestCar=cars[0];
if(localStorage.getItem("bestBrain")){
    for(let i=0;i<cars.length;i++){
        cars[i].brain=JSON.parse(
            localStorage.getItem("bestBrain"));
        if(i!=0){
            NeuralNetwork.mutate(cars[i].brain,0.115);
        }
    }
}

   /*const traffic=[
    new Car(road.getLaneCenter(1),-100,30,50,"DUMMY",2),
    new Car(road.getLaneCenter(2),-300,30,50,"DUMMY",2),
    new Car(road.getLaneCenter(0),-300,30,50,"DUMMY",2),
    new Car(road.getLaneCenter(1),-500,30,50,"DUMMY",2),
    new Car(road.getLaneCenter(0),-700,30,50,"DUMMY",2),
    new Car(road.getLaneCenter(1),-700,30,50,"DUMMY",2),
    new Car(road.getLaneCenter(2),-900,30,50,"DUMMY",2),
    new Car(road.getLaneCenter(1),-1100,30,50,"DUMMY",2),
    new Car(road.getLaneCenter(2),-1100,30,50,"DUMMY",2),
    new Car(road.getLaneCenter(0),-1300,30,50,"DUMMY",2),
    new Car(road.getLaneCenter(0),-1500,30,50,"DUMMY",2),
    new Car(road.getLaneCenter(2),-1500,30,50,"DUMMY",2),
    new Car(road.getLaneCenter(1),-1700,30,50,"DUMMY",2),
    new Car(road.getLaneCenter(2),-1900,30,50,"DUMMY",2),
    new Car(road.getLaneCenter(2),-2000,30,50,"DUMMY",2),
    new Car(road.getLaneCenter(0),-2200,30,50,"DUMMY",2),
    new Car(road.getLaneCenter(0),-2350,30,50,"DUMMY",2),
    new Car(road.getLaneCenter(2),-2600,30,50,"DUMMY",2),
    new Car(road.getLaneCenter(1),-2750,30,50,"DUMMY",2),
    new Car(road.getLaneCenter(2),-2750,30,50,"DUMMY",2),
    new Car(road.getLaneCenter(0),-3000,30,50,"DUMMY",2)
]; */

const traffic=[];

// the most-forward traffic car (smallest y); defaults near the start line
function furthestTrafficY(){
    let top = 100;
    for(const t of traffic){
        if(t.y < top){ top = t.y; }
    }
    return top;
}

// one car, exactly 250px ahead of the furthest car → spacing never compresses
function addTrafficRow(){
    const y = furthestTrafficY() - 250;             // 250px ahead of furthest car (correct spacing)
    const lanes = [0,1,2].sort(()=>Math.random()-0.5); // shuffle the 3 lanes
    const count = Math.random() < 0.5 ? 1 : 2;         // 1 or 2 cars this row (always a lane open)
    for(let i=0; i<count; i++){
        traffic.push(new Car(road.getLaneCenter(lanes[i]), y, 30, 50, "DUMMY", 2));
    }
}

// start with some traffic ahead
for(let i=0;i<30;i++){
    addTrafficRow();
}

let prevBest;        // who the camera was on last frame
let flashFrames=0;   // counts down while the "NEW LEADER" message shows

animate();
function save(){
    localStorage.setItem("bestBrain",
        JSON.stringify(bestCar.brain));
}

function discard(){
    localStorage.removeItem("bestBrain");
}

function generateCars(N){
    const cars=[];
    for(let i=1;i<=N;i++){
        const car=new Car(road.getLaneCenter(1),100,30,50,"AI");
        car.id=i;                // give each car a number
        cars.push(car);
    }
    return cars;
}

function fitness(car){
    let score=-car.y;                   // went far forward
    if(car.damaged){ score=score-500; } // didn't crash
    return score;
}

function animate(time){
    for(let i=0;i<traffic.length;i++){
        traffic[i].update(road.borders,[]);
    }
    for(let i=0;i<cars.length;i++){
        cars[i].update(road.borders,traffic);
    }

    bestCar=cars[0];
    for(let i=1;i<cars.length;i++){
        if(fitness(cars[i])>fitness(bestCar)){
            bestCar=cars[i];
        }
    }

    if(prevBest && prevBest!=bestCar){
        flashFrames=60;   // show the message for ~1 second
    }
    prevBest=bestCar;

    // keep ~2000px of traffic ahead of the leader (exact 250px spacing)
    while(furthestTrafficY() > bestCar.y - 2000){
        addTrafficRow();
    }

    // remove traffic far behind the leader (keeps it fast on long runs)
    for(let i=traffic.length-1; i>=0; i--){
        if(traffic[i].y > bestCar.y + 1500){
            traffic.splice(i, 1);
        }
    }

    carCanvas.height=window.innerHeight;
    networkCanvas.height=window.innerHeight;

    carCtx.save();
    carCtx.translate(0,-bestCar.y+carCanvas.height*0.7);

    road.draw(carCtx);
    for(let i=0;i<traffic.length;i++){
        traffic[i].draw(carCtx,"red");
    }
    carCtx.globalAlpha=0.2;
    for(let i=0;i<cars.length;i++){
        cars[i].draw(carCtx,"blue");
    }
    carCtx.globalAlpha=1;
    bestCar.draw(carCtx,"blue",true);

    carCtx.restore();

    // fixed on-screen info (stays in corner, does not scroll)
    carCtx.fillStyle="black";
    carCtx.font="16px Arial";
    carCtx.fillText("Best score: "+Math.round(fitness(bestCar)), 10, 25);
    carCtx.fillText("Camera on car #"+bestCar.id, 10, 45);

    if(flashFrames>0){
        carCtx.fillStyle="red";
        carCtx.font="bold 20px Arial";
        carCtx.fillText("Car Changed!", 10, 72);
        flashFrames--;
    }

    networkCtx.lineDashOffset=-time/50;
    Visualizer.drawNetwork(networkCtx,bestCar.brain);
    requestAnimationFrame(animate);
}
