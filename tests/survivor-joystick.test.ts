import {it,expect} from 'vitest';
import {joystickVector} from '../src/SurvivorJoystick';
it('ignores a resting thumb and follows horizontal drag',()=>{expect(joystickVector(2,3)).toEqual({x:0,y:0});expect(joystickVector(15,0)).toEqual({x:.5,y:0});});
it('keeps diagonal and far-outside drags inside the circular travel limit',()=>{for(const [x,y] of [[30,30],[-300,400],[500,0]]){const v=joystickVector(x,y);expect(Math.hypot(v.x,v.y)).toBeCloseTo(1);expect(Math.sign(v.x)).toBe(Math.sign(x));expect(Math.sign(v.y)).toBe(Math.sign(y));}});
it('applies adjustable dead zone and sensitivity without exceeding full speed',()=>{expect(joystickVector(8,0,30,10,1)).toEqual({x:0,y:0});expect(joystickVector(15,0,30,5,1.5).x).toBe(.75);expect(joystickVector(15,0,30,5,.75).x).toBe(.375);for(const radius of [24,48])for(const sensitivity of [.75,1.5])expect(Math.hypot(...Object.values(joystickVector(200,-300,radius,12,sensitivity)))).toBeCloseTo(1);});
