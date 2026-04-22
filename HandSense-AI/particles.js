class Particle {
    constructor(x, y, color, size, speedX, speedY) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.speedX = speedX;
        this.speedY = speedY;
        this.life = 1.0;
        this.decay = 0.02;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= this.decay;
        this.size *= 0.95;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.restore();
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.colors = ['#00f2fe', '#4facfe', '#ff007a', '#7000ff'];
    }

    emit(x, y, isRainbow = false) {
        const color = isRainbow 
            ? `hsl(${Math.random() * 360}, 100%, 50%)` 
            : this.colors[Math.floor(Math.random() * this.colors.length)];
        
        for (let i = 0; i < 2; i++) {
            this.particles.push(new Particle(
                x, y, color, 
                Math.random() * 5 + 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            ));
        }
    }

    updateAndDraw(ctx) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].life <= 0) {
                this.particles.splice(i, 1);
            } else {
                this.particles[i].draw(ctx);
            }
        }
    }
}
