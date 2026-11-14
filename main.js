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
// A brain I trained, baked in so the live demo drives well for everyone.
// Uses a visitor's own saved brain if they have one, otherwise this trained one.
const DEFAULT_BRAIN = {"levels":[{"inputs":[0.6370449953499573,0,0,0.4237951129553508,0.6516561755181542],"outputs":[0,0,1,1,0,0],"biases":[0.2752934179383898,0.09942989555920671,-0.2056722091577779,-0.24093446973193128,0.16766565000927416,0.06978500376481428],"weights":[[0.11699661575636733,0.036365131886175364,-0.23435676445868955,-0.16117438282305496,-0.2634429030097417,-0.2647162151072817],[-0.2317634563479072,-0.1409648358856311,-0.3358411250920446,-0.05032662976991462,-0.11541030111811519,-0.08487317698556171],[-0.08776693644578717,-0.05494316600436284,-0.19598303149394614,-0.21434665973440398,0.2591513739834763,-0.22136712040297477],[-0.08174280891027723,-0.0876792869785518,-0.10111213032819703,-0.09631416099319914,0.4065258194837738,0.011326857482423736],[0.13623489279826384,0.046953375255152335,0.010725728081302396,0.18396911270824695,0.24085101243262494,-0.24210580130639522]]},{"inputs":[0,0,1,1,0,0],"outputs":[1,1,1,0],"biases":[-0.1871733085018148,0.0364928822469401,-0.11115271842502712,0.3748480630778244],"weights":[[-0.006682953283570978,0.027471453983701842,-0.03627577606044628,0.3294801958747618],[0.11117853305794864,0.22641603675268418,0.44263066973813203,0.06691219580174017],[0.2839163748248691,0.07432084282905525,-0.1664465815530377,-0.25047265084766535],[0.05601047613468432,0.019692937982274686,0.06982077061550411,0.21162319762694215],[0.2520981138315236,0.3037243218446418,-0.2392403026091145,-0.07482848050875943],[-0.0603478250237382,0.2598367682803533,-0.03319832942954745,-0.18567617595194194]]}]};

const savedBrain=localStorage.getItem("bestBrain");
const baseBrain=savedBrain?JSON.parse(savedBrain):DEFAULT_BRAIN;
for(let i=0;i<cars.length;i++){
    cars[i].brain=JSON.parse(JSON.stringify(baseBrain));
    if(i!=0){
        NeuralNetwork.mutate(cars[i].brain,0.115);
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
