import {it,expect} from 'vitest';
import {joystickVector} from '../src/SurvivorJoystick';
it('ignores a resting thumb and follows horizontal drag',()=>{expect(joystickVector(2,3)).toEqual({x:0,y:0});expect(joystickVector(15,0)).toEqual({x:.5,y:0});});
it('keeps diagonal and far-outside drags inside the circular travel limit',()=>{for(const [x,y] of [[30,30],[-300,400],[500,0]]){const v=joystickVector(x,y);expect(Math.hypot(v.x,v.y)).toBeCloseTo(1);expect(Math.sign(v.x)).toBe(Math.sign(x));expect(Math.sign(v.y)).toBe(Math.sign(y));}});
