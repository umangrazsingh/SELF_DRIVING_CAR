class Car{
    constructor(x,y,width,height,controlType,maxSpeed=3){
        this.x=x;
        this.y=y;
        this.width=width;
        this.height=height;

        this.speed=0;
        this.acceleration=0.2;
        this.maxSpeed=maxSpeed;
        this.friction=0.05;
        this.angle=0;
        this.damaged=false;
        this.useBrain=controlType=="AI";

        if(controlType!="DUMMY"){
            this.sensor=new Sensor(this);
            this.brain=new NeuralNetwork(
                [this.sensor.rayCount,6,4]
            );
        }
        this.controls=new Controls(controlType);
    }
    update(roadBorders,traffic){
        if(!this.damaged){
            this.#move();
            this.polygon=this.#createPolygon();
            this.damaged=this.#assessDamage(roadBorders,traffic);
        }
        if(this.sensor){
            this.sensor.update(roadBorders,traffic);
            const offsets=this.sensor.readings.map(
                s=>s==null?0:1-s.offset
            );
            const outputs=NeuralNetwork.feedForward(offsets, this.brain);
        
            if(this.useBrain){
                this.controls.forward=outputs[0];
                this.controls.left=outputs[1];
                this.controls.right=outputs[2];
                this.controls.reverse=outputs[3];
            }
        }
    }

    #assessDamage(roadBorders,traffic){
        for(let i=0;i<roadBorders.length;i++){
            if(polysIntersect(this.polygon,roadBorders[i])){
                return true;
            }
        }
        for(let i=0;i<traffic.length;i++){
            if(polysIntersect(this.polygon,traffic[i].polygon)){
                return true;
            }
        }
        return false;
    }

    #createPolygon(){
        const points=[];
        const rad=Math.hypot(this.width,this.height)/2;
        const alpha=Math.atan2(this.width,this.height);
        points.push({
            x:this.x-Math.sin(this.angle-alpha)*rad,
            y:this.y-Math.cos(this.angle-alpha)*rad
        });
        points.push({
            x:this.x-Math.sin(this.angle+alpha)*rad,
            y:this.y-Math.cos(this.angle+alpha)*rad
        });
        points.push({
            x:this.x-Math.sin(Math.PI+this.angle-alpha)*rad,
            y:this.y-Math.cos(Math.PI+this.angle-alpha)*rad
        });
        points.push({
            x:this.x-Math.sin(Math.PI+this.angle+alpha)*rad,
            y:this.y-Math.cos(Math.PI+this.angle+alpha)*rad
        });
        return points;
    }
    #move(){
        if(this.controls.forward){
            this.speed+=this.acceleration;
        }
        if(this.controls.reverse){
            this.speed-=this.acceleration;
        }
        if(this.speed>this.maxSpeed){
            this.speed=this.maxSpeed;
        }
        if(this.speed<-this.maxSpeed/2){
            this.speed=-this.maxSpeed/2;
        }
        if(this.speed>0){
            this.speed-=this.friction;
        }
        if(this.speed<0){
            this.speed+=this.friction
        }
        if(Math.abs(this.speed)<this.friction){
            this.speed=0;
        }

        if(this.speed!=0){
            const flip=this.speed>0?1:-1;

        if(this.controls.left){
            this.angle+=0.03*flip;
        }
        if(this.controls.right){
            this.angle-=0.03*flip;
        }
    }    
        this.x-=Math.sin(this.angle)*this.speed;
        this.y-=Math.cos(this.angle)*this.speed;    }

draw(ctx,color,drawSensor=false){
        ctx.save();
        ctx.translate(this.x,this.y);
        ctx.rotate(-this.angle);

        const w=this.width;
        const h=this.height;
        const bodyColor=this.damaged?"gray":color;
        const hw=w/2;
        const hh=h/2;

        // side mirrors
        ctx.fillStyle=bodyColor;
        ctx.beginPath();
        ctx.ellipse(-hw-1,-hh*0.28,3,1.8,-0.3,0,Math.PI*2);
        ctx.ellipse(hw+1,-hh*0.28,3,1.8,0.3,0,Math.PI*2);
        ctx.fill();

        // body: round nose, wide front + back fenders, pinched "waist" in the middle
        ctx.beginPath();
        ctx.moveTo(0,-hh);
        ctx.bezierCurveTo(hw*0.45,-hh,hw*0.85,-hh*0.97,hw*0.92,-hh*0.78);   // nose → front right
        ctx.bezierCurveTo(hw,-hh*0.66,hw,-hh*0.52,hw,-hh*0.42);             // front fender
        ctx.bezierCurveTo(hw,-hh*0.2,hw*0.76,-hh*0.15,hw*0.76,0);           // dent in
        ctx.bezierCurveTo(hw*0.76,hh*0.15,hw,hh*0.2,hw,hh*0.42);            // rear fender out
        ctx.bezierCurveTo(hw,hh*0.75,hw*0.95,hh*0.95,hw*0.7,hh);            // rear right corner
        ctx.bezierCurveTo(hw*0.3,hh*1.02,-hw*0.3,hh*1.02,-hw*0.7,hh);       // tail
        ctx.bezierCurveTo(-hw*0.95,hh*0.95,-hw,hh*0.75,-hw,hh*0.42);        // rear left corner
        ctx.bezierCurveTo(-hw,hh*0.2,-hw*0.76,hh*0.15,-hw*0.76,0);          // rear fender in
        ctx.bezierCurveTo(-hw*0.76,-hh*0.15,-hw,-hh*0.2,-hw,-hh*0.42);      // dent out
        ctx.bezierCurveTo(-hw,-hh*0.52,-hw,-hh*0.66,-hw*0.92,-hh*0.78);      // front fender
        ctx.bezierCurveTo(-hw*0.85,-hh*0.97,-hw*0.45,-hh,0,-hh);             // back to nose
        ctx.fill();

        // racing stripes (clipped so they stay inside the body), not on red traffic cars
        if(color!="red"){
            ctx.save();
            ctx.clip();
            ctx.fillStyle="rgba(255,255,255,0.9)";
            ctx.fillRect(-hw*0.32,-hh,hw*0.22,h);
            ctx.fillRect(hw*0.1,-hh,hw*0.22,h);
            ctx.restore();
        }

        // headlights
        ctx.fillStyle="#fffbe0";
        ctx.beginPath();
        ctx.ellipse(-hw*0.58,-hh*0.86,hw*0.2,hh*0.06,0.5,0,Math.PI*2);
        ctx.ellipse(hw*0.58,-hh*0.86,hw*0.2,hh*0.06,-0.5,0,Math.PI*2);
        ctx.fill();

        // windshield (front, dark glass, curved top)
        ctx.fillStyle="#1a1a1a";
        ctx.beginPath();
        ctx.moveTo(-hw*0.68,-hh*0.12);
        ctx.lineTo(hw*0.68,-hh*0.12);
        ctx.lineTo(hw*0.6,-hh*0.5);
        ctx.quadraticCurveTo(0,-hh*0.66,-hw*0.6,-hh*0.5);
        ctx.fill();

        // rear window
        ctx.beginPath();
        ctx.moveTo(-hw*0.7,hh*0.5);
        ctx.lineTo(hw*0.7,hh*0.5);
        ctx.lineTo(hw*0.58,hh*0.74);
        ctx.quadraticCurveTo(0,hh*0.82,-hw*0.58,hh*0.74);
        ctx.fill();

        // side windows
        ctx.beginPath();
        ctx.moveTo(-hw*0.74,-hh*0.14);
        ctx.lineTo(-hw*0.64,-hh*0.14);
        ctx.lineTo(-hw*0.64,hh*0.44);
        ctx.lineTo(-hw*0.72,hh*0.38);
        ctx.moveTo(hw*0.74,-hh*0.14);
        ctx.lineTo(hw*0.64,-hh*0.14);
        ctx.lineTo(hw*0.64,hh*0.44);
        ctx.lineTo(hw*0.72,hh*0.38);
        ctx.fill();


        ctx.restore();

        if(this.sensor && drawSensor){
            this.sensor.draw(ctx);
        }
    }
}
