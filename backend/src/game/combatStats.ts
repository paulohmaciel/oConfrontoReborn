import { baseVocation, vocations, isPromoted, promotion, classTierOf, classBonus } from '../../../shared/adventure';
interface CombatCharacter { strength:number; agility:number; resistance:number; level:number; vocation:string; classTier?:number }
interface Gear { upgradeTier:number; blueprint:{attack:number;defense:number;armor:number;magicAttack:number;criticalChance:number;fireResistance:number;speed:number} }
export function combatStats(c:CombatCharacter, equipment:Gear[]) {
  let weapon=0,defense=c.resistance,armor=0,magic=0,critical=0,fireResistance=0,speed=0;
  for(const i of equipment) {
    const b=i.blueprint,m=1+i.upgradeTier*.1;
    weapon+=Math.floor(b.attack*m);magic+=Math.floor(b.magicAttack*m);
    armor+=Math.floor(b.armor*m);defense+=Math.floor(b.defense*m)+Math.floor(b.armor*m)*2;
    critical+=b.criticalChance;fireResistance+=b.fireResistance;speed+=b.speed;
  }
  const v=baseVocation(c.vocation),profile=vocations[v],up=isPromoted(c.vocation);
  // Classes depois da promoção (2ª a 8ª) somam um bônus pequeno por classe.
  const extra=Math.max(0,classTierOf(c.vocation,c.classTier??0)-1),atkClass=1+extra*classBonus.attack,defClass=1+extra*classBonus.defense;
  const base=v==='PALADIN'?c.strength*1.3+c.agility*.8:v==='SORCERER'||v==='DRUID'?c.strength*.5+c.resistance*1.5+magic:c.strength*2;
  return { attack:Math.floor((base+weapon+Math.floor(c.level*1.5))*profile.attackScale*(up?promotion.attackScale:1)*atkClass), defense:Math.floor(defense*profile.defenseScale*(up?promotion.defenseScale:1)*defClass),armor,magic,
    criticalChance:Math.min(45,10+Math.floor(c.agility/4)+critical+profile.critical+(up?promotion.critical:0)+extra*classBonus.critical), fireResistance:Math.min(75,fireResistance),dodgeChance:Math.min(20,speed+profile.dodge) };
}
