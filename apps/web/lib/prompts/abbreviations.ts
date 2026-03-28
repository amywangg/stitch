/**
 * Comprehensive knitting/crochet abbreviation glossary.
 * Shared between pattern-parse.ts (PDF parsing) and pattern-builder.ts (AI generation).
 * Source: Craft Yarn Council standard abbreviations + common pattern conventions.
 */
export const KNITTING_ABBREVIATIONS = `
BASIC STITCHES & ACTIONS:
k=knit, p=purl, st/sts=stitch/stitches, sl=slip, sl1k=slip 1 knitwise, sl1p=slip 1 purlwise,
sl st=slip stitch, yo=yarn over, byo=backward yarn over, yon=yarn over needle, yrn=yarn round needle,
co=cast on, bo=bind off, kwise=knitwise, pwise=purlwise, tog=together,
tbl=through back loop, tfl=through front loop

INCREASES:
inc=increase, kfb=knit 1 into front and back (single knit increase),
pfb=purl 1 into front and back (single purl increase),
M1/M1K=make one knitwise (single knit increase),
M1L=make one left (single left-leaning knit increase),
M1R=make one right (single right-leaning knit increase),
M1p=make one purlwise (single purl increase),
M1lp/M1LP=make one left purlwise, M1rp/M1RP=make one right purlwise,
k1B=knit stitch in row below,
LLI=left lifted increase, RLI=right lifted increase

DECREASES:
dec=decrease, k2tog=knit 2 together (single right-leaning decrease),
p2tog=purl 2 together (single decrease),
ssk=slip 2 knitwise then knit together through back loops (single left-leaning decrease),
ssp=slip 2 knitwise then purl together through back loops (single left-leaning decrease),
sssk=slip 3 knitwise then knit together through back loops (double left-leaning decrease),
sssp=slip 3 knitwise then purl together through back loops (double left-leaning decrease),
SKP/skp=slip 1 knitwise knit 1 pass slip stitch over (single left-leaning decrease),
SK2P=slip 1 knitwise knit 2 together pass slip stitch over (double left-leaning decrease),
S2KP2=slip 2 as if to k2tog knit 1 pass 2 slipped stitches over (centered double decrease),
SSPP2=centered double purl decrease,
ksp=knit 1 slip back pass second stitch over (single right-leaning decrease),
psso=pass slipped stitch over, p2sso=pass 2 slipped stitches over

CABLES:
cn=cable needle, C2/C4/C6=cable over 2/4/6 stitches (pattern defines direction),
C2F/C2B=cable 2 front/back, C4F/C4B=cable 4 front/back

STITCH PATTERNS:
St st=stockinette stitch, rev St st=reverse stockinette stitch,
w&t=wrap and turn, GSR=German short row

COLORWORK:
MC=main color, CC/CC1/CC2=contrasting color(s),
intarsia=separate yarn sections, stranded=carry yarn across back (Fair Isle technique),
color dominance=which yarn is held in which hand affects appearance

CROCHET-SPECIFIC:
ch=chain, sc=single crochet, dc=double crochet, hdc=half double crochet,
tr/tc=treble/triple crochet, sl st=slip stitch, FPdc=front post double crochet,
BPdc=back post double crochet, FPtr=front post treble crochet, BPtr=back post treble crochet,
puff st=puff stitch, bob=bobble, pc=popcorn, sk=skip, sp=space,
turning ch=turning chain (ch at row start to gain height)

MARKERS & TOOLS:
pm=place marker, sm=slip marker, m=marker,
dpn/dpns=double-pointed needle(s), LH=left hand, RH=right hand

YARN POSITION:
wyib=with yarn in back, wyif=with yarn in front, yb=yarn back, yfwd/yf=yarn forward

PATTERN STRUCTURE:
rs=right side, ws=wrong side, rnd/rnds=round/rounds, alt=alternate,
approx=approximately, beg=beginning, bet=between, cont=continue,
foll=follow, lp=loop, pat/patt=pattern, prev=previous, rem=remaining,
rep=repeat

CONSTRUCTION:
i-cord=knitted cord worked on dpns or circular needles,
picking up stitches=inserting needle through edge and drawing through a loop,
grafting/Kitchener stitch=joining live stitches seamlessly,
short rows=partial rows for shaping (W&T or German short rows),
steek=reinforced cut line in colorwork

NOTATION:
* = repeat instructions following the asterisk as directed
** = repeat instructions between asterisks as directed
{} [] () = work instructions within brackets as many times as directed,
  or work a group of stitches all in the same stitch or space

MEASUREMENTS:
" or in=inch, cm=centimeter, g=gram, m=meter, mm=millimeter, oz=ounce, yd=yard

REGIONAL DIFFERENCES (US vs Canada/UK):
US "bind off" = Canada/UK "cast off"
US "gauge" = Canada/UK "tension"
US "slip stitch (sl st)" = Canada/UK "slip stitch (ss)"
US crochet terms differ from UK: US sc = UK dc, US dc = UK tr, US hdc = UK htr
`.trim()
