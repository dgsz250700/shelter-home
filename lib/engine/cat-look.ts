// Visual traits of a catalog cat. The personality decides pose and expression.
export const PERSONALITIES=['gruñón','dormilón','cariñoso','travieso','asustadizo','curioso','elegante','loquito'] as const;
export type Personality=typeof PERSONALITIES[number];
export type CatSize='small'|'medium'|'large';
export type CatBuild='slim'|'normal'|'chubby';
export type CatCoat='short'|'fluffy';
export type CatTail='thin'|'normal'|'fluffy';
export type CatEars='small'|'normal'|'large';
export type CatPattern='liso'|'atigrado'|'bicolor'|'ahumado';
export type CatLook={personality:string;size:CatSize;build:CatBuild;coat:CatCoat;tail:CatTail;ears:CatEars;pattern:string;palette:{body:string;belly:string};accessories?:string[]};
export type CatPose='sitSide'|'curl'|'sitWrap'|'pounce'|'crouch'|'sitTilt'|'sitTall'|'bellyUp';
export type CatExpression='grumpy'|'sleepy'|'happy'|'alert'|'scared'|'curious'|'calm'|'crazy';
export type Mood={pose:CatPose;expression:CatExpression;ears:'back'|'normal'|'forward';extra?:'zzz'|'sweat'|'butterfly'|'spin'};
export const MOODS:Record<Personality,Mood>={
 gruñón:{pose:'sitSide',expression:'grumpy',ears:'back'},
 dormilón:{pose:'curl',expression:'sleepy',ears:'normal',extra:'zzz'},
 cariñoso:{pose:'sitWrap',expression:'happy',ears:'normal'},
 travieso:{pose:'pounce',expression:'alert',ears:'forward'},
 asustadizo:{pose:'crouch',expression:'scared',ears:'back',extra:'sweat'},
 curioso:{pose:'sitTilt',expression:'curious',ears:'forward',extra:'butterfly'},
 elegante:{pose:'sitTall',expression:'calm',ears:'normal'},
 loquito:{pose:'bellyUp',expression:'crazy',ears:'normal',extra:'spin'},
};
export const moodFor=(personality:string):Mood=>MOODS[personality as Personality]??MOODS.cariñoso;
export const DEFAULT_LOOK:CatLook={personality:'cariñoso',size:'medium',build:'normal',coat:'short',tail:'normal',ears:'normal',pattern:'atigrado',palette:{body:'#d99a5b',belly:'#f7e6cf'}};
