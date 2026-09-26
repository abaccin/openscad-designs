// USER SETTINGS: edit this section or use the OpenSCAD Customizer.
// All dimensions are millimeters. Start with the outside box dimensions.
// Set divider counts above zero for compartments; leave both at zero for an open box.
// Enable withLid and choose lidStyle; stacking applies only without a lid.
// Preview with F5, check console messages, then render with F6 before exporting.

/* [Display] */
// Choose the part to preview/export. A lid is only generated when withLid=true.
itemsShown="both"; // [both,box,lid]

/* [Colors] */
// Main box preview color: name, hex string, or RGB/RGBA vector (components 0 to 1).
boxColor="white";
// Lid body preview color. STL exports require filament assignment in the slicer.
lidColor="white";
// Robot relief artwork color.
robotColor="black";
// Personal logo color.
logoColor="black";
// Custom lid text color.
textColor="green";
// Generate solid inlays in decoration cavities for multi-color 3D printing/preview.
withColorInlay=false;
// all uses itemsShown; a component overrides itemsShown but still requires its enable flags.
colorShown="all"; // [all,box,lid,robot,logo,text]

/* [Box] */
// Outside length along X; must exceed twice wallThickness.
boxLength=100;
// Nominal width along Y, excluding raised sliding grips; must exceed twice wallThickness.
boxWidth=95;
// Overall outside height, including the lid when enabled or the inset stacking base.
boxHeight=50;
// Outside corner radius; greater than wallThickness, at most half the shorter side.
cornerRadius=5;
// Side-wall thickness. Choose a value your printer can resolve.
wallThickness=2.5;
// Floor thickness; stacking raises the floor by stackingDepth without thinning it.
bottomThickness=2;

/* [Internal divisions] */
// Number of divider walls across X (length). 0 disables this direction; N makes N+1 columns.
dividerCountX=0;
// Number of divider walls across Y (width). 0 disables this direction; N makes N+1 rows.
dividerCountY=5;
// Divider height measured UP from the interior floor, not the build plate.
dividerHeight=25;
// Thickness shared by all divider walls; independent of the outer wall thickness.
dividerThickness=1.2;
// [] spaces X compartments equally. Otherwise enter dividerCountX clear lengths, e.g. [40,55] for 2 walls; the final compartment uses the remainder.
compartmentSizesX=[];
// [] spaces Y compartments equally. Otherwise enter dividerCountY clear widths from Y=0; the final compartment uses the remainder.
compartmentSizesY=[18];

/* [Stacking] */
// Enable a locating base for lidless boxes only; automatically ignored withLid=true.
withStacking=false;
// Base height/insertion depth. Raises the floor and reduces the available divider height.
stackingDepth=3;
// Gap per side between the inset base and the lower box's inner wall.
stackingClearance=0.25;

/* [Lid] */
// Generate a matching box and separate lid; disables the stacking base.
withLid=true;
// Sliding wraps over an external rim; magnetic lifts off vertically.
lidStyle="sliding"; // [sliding,magnetic]
// Sliding lid plate thickness, excluding its downward skirt when assembled.
lidThickness=2;
// Total lateral sliding fit allowance: half on each side between rim and skirt.
lidClearance=0.2;
// Sliding: recess in the skirt's lower edge. Magnetic: underside finger recess.
withNotch=true;

/* [Sliding lid] */
// Skirt depth below the plate when closed. The lid prints face-down, skirt upward.
slidingSkirtDepth=6;
// Skirt wall before cutting its groove; must also leave room for the box rim.
slidingSkirtThickness=1.4;
// Outward rail projection; the matching groove retains the lid against lifting.
slidingRailDepth=0.4;
// Vertical gap at the plate, skirt shoulder, and each groove face.
slidingVerticalClearance=0.2;
// Radius of the box's interior floor-to-wall transition. 0 disables it.
slidingFloorRadius=2;
// Chamfer on the box base and exterior lid perimeter. 0 disables it.
slidingEdgeChamfer=0.5;
// Raised grip ribs on both sides parallel to sliding, near the opening end.
withSlidingGrip=true;
// Outward grip projection per side; adds twice this value to the overall width.
slidingGripProjection=0.8;
// Snap closed with integral flexible skirt tabs; pull the lid to release.
// Face-down printing needs local supports under the free tab tips; clear the slots.
withSlidingLock=true;
// Elastic deflection beyond the lateral fit gap. Tune with a small matching print.
slidingLockInterference=0.2;

/* [Magnetic lid] */
// Full plate thickness, excluding the inset lip. Requires room for pockets and engraving.
magneticLidThickness=5;
// Round magnet diameter. Four pairs require eight magnets.
magnetDiameter=3;
// Round magnet thickness; magnets are glued into accessible pockets after printing.
magnetThickness=3;
// Radial gap per side for glue/fit; pocket diameter = magnetDiameter + 2*this.
magnetPocketClearance=0.1;
// Recess below each seating face; pocket depth = magnetThickness + this.
magnetRecess=0.1;
// Gap per side between the inset lip and the box walls/magnet pads.
magneticLidClearance=0.3;
// Lip insertion depth below the seated lid; leave this space above dividers and ledges.
magneticLidLocatorDepth=2;
// Thickness of the inset perimeter lip, which follows the opening around the magnet pads.
magneticLidLipThickness=1.2;

/* [Internal pull ledges] */
// Short end walls: start is X=0, end is X=boxLength. Remove the lid before lifting.
pullLedges="none"; // [none,start,end,both]
// Ledge width across Y; must fit between the rounded end-wall corners.
pullWidth=30;
// How far each ledge projects into the box. Leave finger space when sizing compartments.
pullProjection=6;
// Thickness at the ledge tip; the 45-degree underside extends farther down.
pullThickness=3;
// Distance down from the box top to the ledge top.
pullTopOffset=8;

/* [Lid artwork] */
// Engrave the large robot artwork when a lid is generated; independent of the small logo.
withLidArtwork=false;
// SVG path relative to this SCAD file. Keep the supplied SVG beside the model.
lidArtworkFile="robot-relief.svg";
// Engraving depth; magnetic lids must also retain 1 mm of skin above the magnet pockets.
lidArtworkDepth=0.5;
// Empty margin around the artwork's allocated area, separate from the logo strip.
lidArtworkMargin=8;
// Expand each side of the linework to make fine lines printable.
lidArtworkLineGrowth=0.2;
// Width/height ratio after rotating the SVG 90 degrees; change for replacement artwork.
lidArtworkAspect=939/453;

/* [Personal lid logo] */
// Engrave the small AB logo opposite the opening recess, with or without robot artwork.
withLidLogo=true;
// Personal SVG path relative to this SCAD file.
lidLogoFile="ab-logo-monochrome.svg";
// Width and height of the supplied square logo. Fine details may need a larger size.
lidLogoSize=25;
// Logo depth; magnetic lids must also retain 1 mm of skin above the magnet pockets.
lidLogoDepth=0.5;
// Space around the logo strip; must clear the active lid edge by internalClearance.
lidLogoMargin=4;

/* [Custom lid text] */
// Engrave a single-line label in its own band, with or without artwork and logo.
withLidText=true;
// Your label. When enabled, this must contain visible characters and no line breaks.
lidText="         Manual Drill";
// Installed font family and optional style; copy a name from Help > Font List.
lidTextFont="Liberation Sans:style=Bold";
// OpenSCAD text size in mm. Long labels need a smaller size; text is not auto-fitted.
lidTextSize=8;
// Engraving depth. Magnetic lids must retain 1 mm of skin above the magnet pockets.
lidTextDepth=0.5;
// Height of the reserved label band along Y; the robot is fitted into the remaining area.
lidTextBandHeight=20;
// Empty margin around the reserved label band, including clearance from the lid edge.
lidTextMargin=4;
// Label center along X from the lid's X=0 edge. undef centers it on the active lid.
lidTextPositionX=undef;
// Label center along Y from the lid's Y=0 edge. undef centers it on the active lid.
lidTextPositionY=undef;

/* [Fit and clearance] */
// Minimum vertical gap under bases/sliding plate/magnetic lip and below ledges.
internalClearance=0.5;

/* [Hidden] */
// End of user settings. Geometry and calculated values below do not need editing.
// Legacy flat-plate setting; ignored by the external-rim sliding design.
lidEdgeThickness=0.5;
assert(is_bool(withLid),"withLid must be true or false.");
assert(is_bool(withStacking),"withStacking must be true or false.");
assert(is_bool(withLidLogo),"withLidLogo must be true or false.");
assert(is_bool(withLidText),"withLidText must be true or false.");
assert(is_bool(withColorInlay),"withColorInlay must be true or false.");
for (setting=[["boxColor",boxColor],["lidColor",lidColor],["robotColor",robotColor],
			 ["logoColor",logoColor],["textColor",textColor]])
	assert(validColor(setting[1]),
		   str(setting[0]," must be a nonempty color name/hex string or an RGB/RGBA vector with numeric components from 0 to 1."));
assert(colorShown=="all" || colorShown=="box" || colorShown=="lid" ||
	   colorShown=="robot" || colorShown=="logo" || colorShown=="text",
	   "colorShown must be all, box, lid, robot, logo, or text.");
assert(is_num(internalClearance) && internalClearance>0,
	   "internalClearance must be positive.");
assert(itemsShown=="both" || itemsShown=="box" || itemsShown=="lid",
	   "itemsShown must be both, box, or lid.");
assert(lidStyle=="sliding" || lidStyle=="magnetic",
	   "lidStyle must be sliding or magnetic.");

function validColor(value)=
	is_string(value) ? len(value)>0 :
	is_list(value) ? (len(value)==3 || len(value)==4) &&
		len([for (v=value) if (!is_num(v) || v<0 || v>1) 1])==0 : false;

function decorationEnabled(part)=
	part=="robot" ? withLidArtwork : part=="logo" ? withLidLogo : withLidText;

if (withLid && lidStyle=="magnetic") magneticChecks() scene();
else if (withLid) slidingChecks() scene();
else scene();

module scene(){
	if (colorShown=="box" || (colorShown=="all" && itemsShown!="lid")) showBox();
	if (withLid && (colorShown!="box" && (colorShown!="all" || itemsShown!="box")))
		showLid();
	if (!withLid && (colorShown=="lid" || colorShown=="robot" ||
					colorShown=="logo" || colorShown=="text" ||
					(colorShown=="all" && itemsShown=="lid")))
		echo("Lid disabled: set withLid=true, or select itemsShown=box or both.");
	if (withLid && (colorShown=="robot" || colorShown=="logo" || colorShown=="text")){
		if (!withColorInlay)
			echo("Color inlays disabled: set withColorInlay=true to export decoration solids.");
		else if (!decorationEnabled(colorShown))
			echo(str("Decoration disabled: enable ",colorShown=="robot" ? "withLidArtwork" :
					 colorShown=="logo" ? "withLidLogo" : "withLidText"," to export ",colorShown,"."));
	}
}

module showLid(){
	if (lidStyle=="magnetic")
		translate([0,-boxWidth-2*wallThickness,0]) magneticLid();
	else slidingLid();
}

module slidingLidBody(decorated=true){
	color(lidColor)
	difference(){
		slidingPrintPlacement() slidingLidBlank();
		if (decorated)
			for (part=["robot","logo","text"]) decorationInPrint(part);
	}
}

module slidingLid(){
	if (colorShown=="all" || colorShown=="lid") slidingLidBody();
	lidInlays();
}

module decorationInPrint(part,magnetic=false){
	if (magnetic)
		translate([0,0,magneticLidThickness])
		rotate([180,0,0])
		lidDecorations(boxLength,boxWidth,magneticLidThickness,magneticLidThickness,
					   part=part);
	else
		slidingPrintPlacement()
		translate([0,0,lidThickness])
		rotate([180,0,0])
		lidDecorations(boxLength,boxWidth,lidThickness,lidThickness-slidingEdgeChamfer,
					   part=part);
}

module previewRender(){
	// F5's cached render() mesh loses exact boundaries needed for F6 material unions.
	if ($preview) render(convexity=10) children();
	else children();
}

module lidInlays(magnetic=false,selected=colorShown){
	parts=["robot","logo","text"];
	if (withColorInlay)
		for (i=[0:2])
			if (decorationEnabled(parts[i]) && (selected=="all" || selected==parts[i]))
				color(i==0 ? robotColor : i==1 ? logoColor : textColor)
				// Resolve coplanar clipping faces so F5 colors only the actual inlay.
				previewRender()
				intersection(){
					// Clip cutters to the actual lid, including its chamfer and recess.
					if (magnetic) magneticLidBody(decorated=false);
					else slidingLidBody(decorated=false);
					difference(){
						decorationInPrint(parts[i],magnetic);
						// Higher-priority material owns intersections: text > logo > robot.
						for (j=[0:2])
							if (j>i) decorationInPrint(parts[j],magnetic);
					}
				}
	}

module lidTextChecks(l,w,h,et){
	if (withLidText){
		assert(is_string(lidText) && len(lidText)>0,
			   "lidText must be a nonempty string when withLidText=true.");
		assert(len([for (i=[0:len(lidText)-1]) if (lidText[i]!=" ") i])>0,
			   "lidText must contain visible characters.");
		assert(len([for (i=[0:len(lidText)-1])
					if (lidText[i]=="\n" || lidText[i]=="\r" || lidText[i]=="\t") i])==0,
			   "lidText must be a single line without tabs or line breaks.");
		assert(is_string(lidTextFont) && len(lidTextFont)>0,
			   "lidTextFont must name an installed font from Help > Font List.");
		assert(is_num(lidTextSize) && lidTextSize>0,"lidTextSize must be positive.");
		assert(is_num(lidTextDepth) && lidTextDepth>0 && lidTextDepth<h,
			   "lidTextDepth must be positive and less than the active lid thickness.");
		assert(is_num(lidTextBandHeight) && lidTextBandHeight>0 && lidTextBandHeight<w,
			   "lidTextBandHeight must be positive and smaller than the lid width.");
		assert(is_num(lidTextMargin) && lidTextMargin>=h-et+internalClearance,
			   "lidTextMargin must clear the lid edge by internalClearance.");
		assert(is_undef(lidTextPositionX) || is_num(lidTextPositionX),
			   "lidTextPositionX must be a number or undef for centered text.");
		assert(is_undef(lidTextPositionY) || is_num(lidTextPositionY),
			   "lidTextPositionY must be a number or undef for centered text.");
		assert(lidTextBandHeight>=1.5*lidTextSize+2*lidTextMargin,
			   "lidTextBandHeight must be at least 1.5*lidTextSize + 2*lidTextMargin for font ascenders/descenders.");
		assert(l>(withLidLogo ? lidLogoSize+2*lidLogoMargin : 0)+2*lidTextMargin,
			   "The lid must leave space for text beside the logo strip.");
	}
	children();
}

module lidDecorations(l,w,h,et,cutter=true,part="all"){
	lidTextChecks(l,w,h,et)
	let(logoStrip=withLidLogo ? lidLogoSize+2*lidLogoMargin : 0,
		textStrip=withLidText ? lidTextBandHeight : 0,
		textX=is_undef(lidTextPositionX) ? l/2 : lidTextPositionX,
		textY=is_undef(lidTextPositionY) ? w/2 : lidTextPositionY){
		if (withLidArtwork && (part=="all" || part=="robot"))
			translate([logoStrip,0,0])
			lidArtwork(l=l-logoStrip,w=w-textStrip,h=h,cutter=cutter);
		if (withLidLogo && (part=="all" || part=="logo"))
			lidLogo(l=l,w=w,h=h,et=et,cutter=cutter);
		if (withLidText && (part=="all" || part=="text")){
			if (cutter)
				echo(str("Text uses font '",lidTextFont,"' at size ",lidTextSize,
						 " centered at ",textX," x ",textY,
						 " mm from the lid's X=0/Y=0 edges. Preview placement; text is not bounds-checked. Missing fonts may be substituted by OpenSCAD."));
			lidTextGeometry(l=l,w=w,h=h,textX=textX,textY=textY,cutter=cutter);
		}
	}
}

module lidArtwork(l,w,h,cutter=true){
	padding=lidArtworkMargin+lidArtworkLineGrowth;
	artworkLength=min(l-2*padding,(w-2*padding)*lidArtworkAspect);
	assert(lidArtworkAspect>0,"Lid artwork aspect ratio must be positive.");
	assert(lidArtworkDepth>0 && lidArtworkDepth<h,
		   "Lid artwork depth must be positive and less than the lid thickness.");
	assert(lidArtworkMargin>=0,"Lid artwork margin cannot be negative.");
	assert(lidArtworkLineGrowth>=0,"Lid artwork line growth cannot be negative.");
	assert(l>2*padding && w>2*padding,"The lid is too small for the artwork margins.");

	extrudeHeight=cutter ? lidArtworkDepth+0.01 : lidArtworkDepth;
	translate([l/2,-w/2,h-lidArtworkDepth])
	linear_extrude(height=extrudeHeight,convexity=10)
	offset(delta=lidArtworkLineGrowth)
	resize([artworkLength,0],auto=true)
	rotate([0,0,90])
	import(file=lidArtworkFile,center=true);
}

module lidLogo(l,w,h,et,cutter=true){
	assert(lidLogoSize>0,"Lid logo size must be positive.");
	assert(lidLogoDepth>0 && lidLogoDepth<h,
		   "Lid logo depth must be positive and less than the lid thickness.");
	assert(lidLogoMargin>=h-et+internalClearance,
		   "Lid logo margin must clear the lid edge by internalClearance.");
	assert(lidLogoSize+2*lidLogoMargin<min(l,w),
		   "The lid is too small for the logo and its margins.");

	extrudeHeight=cutter ? lidLogoDepth+0.01 : lidLogoDepth;
	translate([lidLogoMargin+lidLogoSize/2,-w/2,h-lidLogoDepth])
	linear_extrude(height=extrudeHeight,convexity=10)
	resize([lidLogoSize,lidLogoSize])
	import(file=lidLogoFile,center=true);
}

module lidTextGeometry(l,w,h,textX,textY,cutter=true){
	extrudeHeight=cutter ? lidTextDepth+0.01 : lidTextDepth;
	translate([textX,-w+textY,h-lidTextDepth])
	linear_extrude(height=extrudeHeight,convexity=10)
	text(lidText,size=lidTextSize,font=lidTextFont,halign="center",valign="center");
}

module showBox(){
	color(boxColor) {
		if (withLid && lidStyle=="magnetic") magneticBox();
		else if (withLid) slidingBox();
		else configuredBox();
	}
}

function slidingRimInset()=slidingSkirtThickness+lidClearance/2;
function slidingSeat()=boxHeight-lidThickness;
function slidingShoulder()=slidingSeat()-slidingSkirtDepth-slidingVerticalClearance;
function slidingRailCenter()=slidingSeat()-slidingSkirtDepth/3;
function slidingRailHalfFlat()=slidingRailDepth/2;
function slidingGripExtent()=withSlidingGrip ? slidingGripProjection : 0;
function slidingLayoutGap()=max(2*wallThickness,2*slidingGripExtent()+2);
function slidingOpenX()=cornerRadius+lidClearance/2;
function slidingLockX()=slidingOpenX()+3;
function slidingLockRootX()=slidingOpenX()+16;
function slidingLockSlotZ()=lidThickness+2*slidingSkirtDepth/3;
function slidingLockTabHeight()=slidingSkirtDepth/3-0.3;
function slidingLockPrintZ()=lidThickness+slidingSkirtDepth-slidingLockTabHeight()/2;
function slidingLockProjection()=lidClearance/2+slidingLockInterference;
function slidingLockHalfHeight()=slidingLockTabHeight()/2-0.35;
function slidingGripEndX()=boxLength-cornerRadius-1;
function slidingGripSpan()=min(24,slidingGripEndX()-
	max(slidingOpenX()+1,withSlidingLock ? slidingLockRootX()+2 : 0));
function slidingBoxGripLow()=max(slidingEdgeChamfer+1,slidingShoulder()-12);
function slidingDividerTop()=slidingSeat()-internalClearance;

module slidingChecks(){
	for (setting=[["lidThickness",lidThickness],["lidClearance",lidClearance],
				  ["slidingSkirtDepth",slidingSkirtDepth],
				  ["slidingSkirtThickness",slidingSkirtThickness],
				  ["slidingRailDepth",slidingRailDepth],
				  ["slidingVerticalClearance",slidingVerticalClearance]])
		assert(is_num(setting[1]) && setting[1]>0,str(setting[0]," must be positive."));
	for (setting=[["slidingFloorRadius",slidingFloorRadius],
				  ["slidingEdgeChamfer",slidingEdgeChamfer]])
		assert(is_num(setting[1]) && setting[1]>=0,str(setting[0]," must be nonnegative."));
	assert(is_bool(withSlidingGrip),"withSlidingGrip must be true or false.");
	assert(is_bool(withSlidingLock),"withSlidingLock must be true or false.");
	assert(is_bool(withNotch),"withNotch must be true or false.");
	assert(is_num(wallThickness) && wallThickness>0 &&
		   is_num(boxLength) && boxLength>2*wallThickness &&
		   is_num(boxWidth) && boxWidth>2*wallThickness,
		   "Box length and width must exceed twice the positive wall thickness.");
	assert(is_num(cornerRadius) && cornerRadius>wallThickness+slidingFloorRadius &&
		   2*cornerRadius<min(boxLength,boxWidth),
		   "Sliding corner radius must exceed wallThickness + slidingFloorRadius and leave straight sides.");
	assert(is_num(bottomThickness) && bottomThickness>0 && is_num(boxHeight),
		   "bottomThickness must be positive and boxHeight must be numeric.");
	assert(wallThickness-slidingRimInset()>=0.8-0.000001,
		   "Sliding rim must retain 0.8 mm of wall; increase wallThickness or reduce slidingSkirtThickness/lidClearance.");
	assert(slidingSkirtThickness-slidingRailDepth>=0.8-0.000001,
		   "Sliding groove must retain 0.8 mm of skin; increase slidingSkirtThickness or reduce slidingRailDepth.");
	assert(slidingRailDepth>lidClearance/2,
		   "slidingRailDepth must exceed lidClearance/2 to capture the lid.");
	assert(slidingEdgeChamfer<min(bottomThickness,lidThickness,slidingSkirtThickness),
		   "slidingEdgeChamfer must be smaller than the floor, lid plate, and skirt thicknesses.");
	assert(slidingShoulder()>bottomThickness+slidingFloorRadius+internalClearance,
		   "Sliding skirt shoulder must clear the rounded floor; increase boxHeight or reduce slidingSkirtDepth/slidingFloorRadius.");
	assert(slidingSkirtDepth/3>=slidingRailDepth+slidingRailHalfFlat()+slidingVerticalClearance+0.801,
		   "Sliding rail must retain 0.8 mm below the plate; increase slidingSkirtDepth or reduce rail depth/vertical clearance.");
	assert(2*slidingSkirtDepth/3>=slidingRailDepth+slidingRailHalfFlat()+slidingVerticalClearance+
		   (withNotch ? 1.5 : 0)+0.801,
		   "Sliding groove must retain 0.8 mm above the skirt tip/recess; increase slidingSkirtDepth or reduce rail depth/vertical clearance.");
	if (withSlidingGrip){
		assert(is_num(slidingGripProjection) && slidingGripProjection>0,
			   "slidingGripProjection must be positive when withSlidingGrip=true.");
		assert(slidingGripSpan()>=1.2,
			   "Sliding grips need 1.2 mm of straight side beyond the lock; increase boxLength or disable the grips/lock.");
		assert(2*slidingGripProjection+0.4<=
			   min(slidingSkirtDepth-0.5,slidingShoulder()-1-slidingBoxGripLow()),
			   "Sliding grip ramps need more height; reduce slidingGripProjection or increase skirt depth/box height.");
	}
	if (withSlidingLock){
		assert(is_num(slidingLockInterference) && slidingLockInterference>0,
			   "slidingLockInterference must be positive when withSlidingLock=true.");
		assert(slidingLockRootX()+4<=boxLength-cornerRadius,
			   "Sliding lock needs a 16 mm spring and 4 mm root before the end corner; increase boxLength or disable the lock.");
		assert(slidingLockSlotZ()-0.3-
			   (lidThickness+slidingSkirtDepth/3+1.5*slidingRailDepth+slidingVerticalClearance)>=0.8-0.000001,
			   "Sliding lock slot must clear the groove by 0.8 mm; increase slidingSkirtDepth or reduce rail depth/vertical clearance.");
		assert(slidingLockHalfHeight()>=slidingLockProjection()+0.1,
			   "Sliding lock bump ramps need more tab height; increase slidingSkirtDepth or reduce lidClearance/slidingLockInterference.");
		assert(slidingSkirtThickness-slidingLockInterference-0.15>=0.8-0.000001,
			   "Sliding lock pocket must retain 0.8 mm of skin; increase slidingSkirtThickness or reduce slidingLockInterference.");
		assert(3*slidingSkirtThickness*slidingLockInterference/
			   (2*pow(slidingLockRootX()-slidingLockX(),2))<=0.005,
			   "Sliding lock deflection exceeds the conservative spring strain limit; reduce slidingLockInterference or slidingSkirtThickness.");
	}
	if (dividerCountX>0 || dividerCountY>0)
		assert(is_num(dividerHeight) && dividerHeight<=slidingDividerTop()-bottomThickness,
			   str("dividerHeight must not exceed ",slidingDividerTop()-bottomThickness,
				   " mm above the interior floor; leave clearance beneath the sliding plate."));
	if (pullLedges!="none")
		assert(is_num(pullTopOffset) && pullTopOffset>=lidThickness+internalClearance,
			   "pullTopOffset must clear the sliding plate: lidThickness + internalClearance.");
	children();
}

module slidingPrintPlacement(){
	translate([0,-boxWidth-slidingLayoutGap(),0]) children();
}

// Apply to print-layout lid geometry; positive travel opens toward X=boxLength.
module slidingAssemblyPlacement(travel=0){
	translate([travel,-slidingLayoutGap(),boxHeight])
	rotate([180,0,0]) children();
}

module slidingOutline(inset=0,open=false){
	left=open ? -boxLength : inset;
	right=boxLength-inset;
	r=cornerRadius-inset;
	hull()
		for (x=[left+r,right-r],y=[cornerRadius,boxWidth-cornerRadius])
			translate([x,y]) circle(r=r,$fn=64);
}

module slidingSlice(z,inset,open=false){
	translate([0,0,z]) linear_extrude(height=0.001) slidingOutline(inset,open);
}

module slidingOuter(height){
	if (slidingEdgeChamfer>0)
		hull(){
			slidingSlice(0,slidingEdgeChamfer);
			slidingSlice(slidingEdgeChamfer,0);
		}
	translate([0,0,slidingEdgeChamfer])
	linear_extrude(height=height-slidingEdgeChamfer)
	slidingOutline();
}

// Convex 45-degree bead; the same section, inverted, cuts the lid groove.
module slidingRailEnvelope(center,inset,verticalGap=0,open=false){
	halfFlat=slidingRailHalfFlat()+verticalGap;
	// Center the thin hull slices so inversion preserves the same bevel heights.
	hull(){
		slidingSlice(center-halfFlat-slidingRailDepth-0.0005,inset,open);
		slidingSlice(center-halfFlat-0.0005,inset-slidingRailDepth,open);
		slidingSlice(center+halfFlat-0.0005,inset-slidingRailDepth,open);
		slidingSlice(center+halfFlat+slidingRailDepth-0.0005,inset,open);
	}
}

module slidingInterior(){
	if (slidingFloorRadius>0)
		hull()
			for (a=[0:10:90])
				slidingSlice(bottomThickness+slidingFloorRadius*(1-cos(a)),
							 wallThickness+slidingFloorRadius*(1-sin(a)));
	translate([0,0,bottomThickness+slidingFloorRadius])
	linear_extrude(height=boxHeight)
	slidingOutline(wallThickness);
}

module slidingSides(){
	for (side=[0,1])
		translate([0,side*boxWidth,0])
		scale([1,side==0 ? 1 : -1,1]) children();
}

module slidingGrips(low,high){
	count=floor((slidingGripSpan()-1.2)/3)+1;
	if (withSlidingGrip)
		slidingSides()
		for (i=[0:count-1])
			translate([slidingGripEndX()-0.6-i*3,0,low])
			hull(){
				translate([-0.6,0,0]) cube([1.2,0.1,high-low]);
				translate([-0.6,-slidingGripProjection,slidingGripProjection])
				cube([1.2,slidingGripProjection+0.1,high-low-2*slidingGripProjection]);
			}
}

// Positive Y is into the wall. Enlarging the same profile gives seated clearance.
module slidingLockShape(clearance=0){
	p=slidingLockProjection();
	h=slidingLockHalfHeight();
	tipHalfWidth=1.5-min(p,1);
	hull(){
		translate([-1.5-clearance,-clearance,-h-clearance])
		cube([3+2*clearance,0.02+2*clearance,2*(h+clearance)]);
		translate([-tipHalfWidth-clearance,-p-clearance,-h+p-clearance])
		cube([2*(tipHalfWidth+clearance),0.02+2*clearance,2*(h-p+clearance)]);
	}
}

module slidingLockBumps(){
	if (withSlidingLock)
		slidingSides()
		translate([slidingLockX(),slidingRimInset(),boxHeight-slidingLockPrintZ()])
		slidingLockShape();
}

module slidingLockCuts(){
	if (withSlidingLock)
		slidingSides(){
			translate([slidingLockX(),slidingRimInset(),slidingLockPrintZ()])
			slidingLockShape(clearance=0.15);
			hull()
				for (x=[slidingOpenX()-0.3,slidingLockRootX()-0.3])
					translate([x,slidingSkirtThickness/2,slidingLockSlotZ()])
					rotate([90,0,0])
					cylinder(r=0.3,h=slidingSkirtThickness+0.2,center=true,$fn=24);
		}
}

module slidingBox(){
	union(){
		difference(){
			union(){
				slidingOuter(slidingShoulder());
				linear_extrude(height=slidingSeat()-slidingVerticalClearance)
				slidingOutline(slidingRimInset());
				intersection(){
					translate([0,0,slidingShoulder()-0.01])
					linear_extrude(height=slidingSkirtDepth+0.01)
					slidingOutline();
					cube([cornerRadius,boxWidth,boxHeight]);
				}
				slidingRailEnvelope(slidingRailCenter(),slidingRimInset());
				slidingLockBumps();
			}
			slidingInterior();
		}
		intersection(){
			// Tall dividers must not refill the external sliding channels.
			linear_extrude(height=boxHeight) slidingOutline(slidingRimInset());
			internalDivisions(l=boxLength,w=boxWidth,bt=bottomThickness,wt=wallThickness,
							  r=cornerRadius,floorHeight=bottomThickness,topLimit=slidingDividerTop(),
							  countX=dividerCountX,countY=dividerCountY,height=dividerHeight,
							  thickness=dividerThickness,sizesX=compartmentSizesX,
							  sizesY=compartmentSizesY,facets=64);
		}
		internalPullLedges(l=boxLength,w=boxWidth,h=boxHeight,bt=bottomThickness,
						   wt=wallThickness,r=cornerRadius,
						   placement=pullLedges,width=pullWidth,projection=pullProjection,
						   thickness=pullThickness,topOffset=pullTopOffset,clearance=internalClearance);
		slidingGrips(slidingBoxGripLow(),slidingShoulder()-1);
	}
}

module slidingLidBlank(){
	difference(){
		union(){
			slidingOuter(lidThickness);
			intersection(){
				translate([0,0,lidThickness-0.01])
				linear_extrude(height=slidingSkirtDepth+0.01) slidingOutline();
				translate([slidingOpenX(),0,0])
				cube([boxLength,boxWidth,lidThickness+slidingSkirtDepth]);
			}
			slidingGrips(lidThickness,lidThickness+slidingSkirtDepth-0.5);
		}
		translate([0,0,lidThickness])
		linear_extrude(height=slidingSkirtDepth+0.01)
		slidingOutline(slidingSkirtThickness,open=true);
		slidingRailEnvelope(lidThickness+slidingSkirtDepth/3,
							slidingSkirtThickness,slidingVerticalClearance,open=true);
		slidingLockCuts();
		if (withNotch)
			translate([boxLength-3,boxWidth/2-5,lidThickness+slidingSkirtDepth-1.5])
			round_cube(l=6,w=10,h=1.51,r=2,$fn=32);
	}
}

module configuredBox(height=boxHeight,ledgeOffset=pullTopOffset,
					 stackable=withStacking,facets=30){
	round_box(l=boxLength,
			  w=boxWidth,
			  h=height,
			  bt=bottomThickness,
			  wt=wallThickness,
			  r=cornerRadius,
			  ledges=pullLedges,
			  ledgeWidth=pullWidth,
			  ledgeProjection=pullProjection,
			  ledgeThickness=pullThickness,
			  ledgeTopOffset=ledgeOffset,
			  stackable=stackable,
			  stackDepth=stackingDepth,
			  stackClearance=stackingClearance,
			  divisionsX=dividerCountX,
			  divisionsY=dividerCountY,
			  divisionHeight=dividerHeight,
			  divisionThickness=dividerThickness,
			  sizesX=compartmentSizesX,
			  sizesY=compartmentSizesY,
			  clearance=internalClearance,
			  facets=facets);
}

function magnetPocketRadius()=magnetDiameter/2+magnetPocketClearance;
function magnetPocketDepth()=magnetThickness+magnetRecess;
function magnetPadRadius()=magnetPocketRadius()+1.2;
function magnetCenters(l,w,wt,r,padRadius)=
	[for (x=[r+padRadius,l-r-padRadius], y=[wt+padRadius,w-wt-padRadius]) [x,y]];

module magneticPads(top){
	padRadius=magnetPadRadius();
	for (p=magnetCenters(boxLength,boxWidth,wallThickness,cornerRadius,padRadius)){
		nearSide=p[1]<boxWidth/2;
		translate([p[0],nearSide ? wallThickness : boxWidth-wallThickness,top])
		rotate([0,0,nearSide ? 90 : -90])
		pullLedge(width=2*padRadius,projection=2*padRadius,
				  thickness=magnetPocketDepth()+1,overlap=min(0.05,wallThickness/4));
	}
}

module magneticFingerRecess(height){
	translate([boxLength-3,boxWidth/2-5,0])
	round_cube(l=6,w=10,h=height,r=2);
}

module magneticOpeningProfile(){
	difference(){
		translate([wallThickness,wallThickness])
		projection()
		round_cube(l=boxLength-2*wallThickness,w=boxWidth-2*wallThickness,
				   h=1,r=cornerRadius-wallThickness,$fn=64);
		projection() magneticPads(top=0);
		if (withNotch) projection() magneticFingerRecess(height=1);
	}
}

module magneticLipProfile(){
	difference(){
		offset(delta=-magneticLidClearance) magneticOpeningProfile();
		offset(delta=-magneticLidClearance-magneticLidLipThickness) magneticOpeningProfile();
	}
}

module magneticChecks(){
	assert(is_num(magneticLidThickness) && magneticLidThickness>0,
		   "magneticLidThickness must be positive.");
	assert(is_num(magnetDiameter) && magnetDiameter>0,
		   "magnetDiameter must be positive.");
	assert(is_num(magnetThickness) && magnetThickness>0,
		   "magnetThickness must be positive.");
	assert(is_num(magnetPocketClearance) && magnetPocketClearance>=0,
		   "magnetPocketClearance must be nonnegative (per side).");
	assert(is_num(magnetRecess) && magnetRecess>=0,
		   "magnetRecess must be nonnegative.");
	assert(is_num(magneticLidClearance) && magneticLidClearance>0,
		   "magneticLidClearance must be positive (per side).");
	assert(is_num(magneticLidLocatorDepth) && magneticLidLocatorDepth>0,
		   "magneticLidLocatorDepth must be positive.");
	assert(is_num(magneticLidLipThickness) && magneticLidLipThickness>0,
		   "magneticLidLipThickness must be positive.");
	assert(is_bool(withNotch),"withNotch must be true or false.");
	assert(is_num(wallThickness) && wallThickness>0 &&
		   is_num(boxLength) && boxLength>2*wallThickness &&
		   is_num(boxWidth) && boxWidth>2*wallThickness,
		   "Box length and width must exceed twice the positive wall thickness.");
	assert(is_num(cornerRadius) && cornerRadius>wallThickness &&
		   2*cornerRadius<=min(boxLength,boxWidth),
		   "Corner radius must exceed wall thickness and fit within the box.");
	assert(is_num(boxHeight) && is_num(bottomThickness) && bottomThickness>0,
		   "Box height must be numeric and bottomThickness must be positive.");

	let(padRadius=magnetPadRadius(),
		seat=boxHeight-magneticLidThickness,
		overlap=min(0.05,wallThickness/4),
		gap=max(internalClearance,magneticLidClearance)){
		assert(magneticLidThickness>=magnetPocketDepth()+1,
			   "magneticLidThickness must leave at least 1 mm of skin above the magnet pockets.");
		assert(cornerRadius+2*padRadius+gap+magneticLidLipThickness<=boxLength/2 &&
			   max(cornerRadius,wallThickness+2*padRadius)+gap+
			   max(magneticLidLipThickness,withNotch ? 5 : 0)<=boxWidth/2,
			   "Magnetic pads and inset lip must fit between the rounded corners; increase box length/width or reduce magnet size/corner radius/lip thickness.");
		assert(min(boxLength,boxWidth)>2*(wallThickness+magneticLidClearance+magneticLidLipThickness)+internalClearance,
			   "magneticLidClearance leaves no space inside the inset lip.");
		assert(seat-magnetPocketDepth()-1-2*padRadius-overlap>=bottomThickness+internalClearance,
			   "Magnetic pad undersides must clear the floor; increase boxHeight or reduce magnet size/thickness.");
		assert(seat-magneticLidLocatorDepth>=bottomThickness+internalClearance,
			   "Magnetic inset lip must clear the floor; increase boxHeight or reduce magneticLidLocatorDepth.");
		if (pullLedges!="none")
			assert(is_num(pullTopOffset) &&
				   pullTopOffset>=magneticLidThickness+magneticLidLocatorDepth+internalClearance,
				   "pullTopOffset must clear the magnetic lip: magneticLidThickness + magneticLidLocatorDepth + internalClearance.");
		if (dividerCountX>0 || dividerCountY>0)
			assert(is_num(dividerHeight) &&
				   dividerHeight<=seat-bottomThickness-magneticLidLocatorDepth-internalClearance,
				   str("dividerHeight must not exceed ",
					   seat-bottomThickness-magneticLidLocatorDepth-internalClearance,
					   " mm above the interior floor; leave clearance for the magnetic inset lip."));
		children();
	}
}

module magnetPockets(top){
	for (p=magnetCenters(boxLength,boxWidth,wallThickness,cornerRadius,magnetPadRadius()))
		translate([p[0],p[1],top-magnetPocketDepth()])
		cylinder(r=magnetPocketRadius(),h=magnetPocketDepth()+0.01,$fn=64);
}

module magneticBox(){
	seat=boxHeight-magneticLidThickness;
	difference(){
		union(){
			configuredBox(height=seat,ledgeOffset=pullTopOffset-magneticLidThickness,
						  stackable=false,facets=64);
			magneticPads(top=seat);
		}
		// Subtract last so dividers or pull ledges cannot fill the blind pockets.
		magnetPockets(seat);
	}
}

module magneticLidBody(decorated=true){
	assert(!withLidArtwork || (is_num(lidArtworkDepth) && lidArtworkDepth>0),
		   "Lid artwork depth must be positive and numeric.");
	assert(!withLidLogo || (is_num(lidLogoDepth) && lidLogoDepth>0),
		   "Lid logo depth must be positive and numeric.");
	lidTextChecks(boxLength,boxWidth,magneticLidThickness,magneticLidThickness)
	let(t=magneticLidThickness,
		engraving=max(withLidArtwork ? lidArtworkDepth : 0,withLidLogo ? lidLogoDepth : 0,
					  withLidText ? lidTextDepth : 0)){
		assert(t>=magnetPocketDepth()+engraving+1,
			   "Magnetic lid engraving must leave at least 1 mm of skin above the magnet pockets; increase magneticLidThickness or reduce engraving depth.");
		assert(!withNotch || t>=1.5+engraving+1,
			   "Magnetic finger recess must leave at least 1 mm of skin below the engraving.");
		color(lidColor)
		difference(){
			union(){
				round_cube(l=boxLength,w=boxWidth,h=t,r=cornerRadius,$fn=64);
				translate([0,0,t-0.01])
				linear_extrude(height=magneticLidLocatorDepth+0.01,convexity=10)
				magneticLipProfile();
			}
			magnetPockets(t);
			if (withNotch)
				translate([0,0,t-1.5]) magneticFingerRecess(height=1.51);
			// Print exterior-face-down: pockets/lip face up and engraving cuts into Z=0.
			if (decorated)
				for (part=["robot","logo","text"]) decorationInPrint(part,magnetic=true);
		}
	}
}

module magneticLid(){
	if (colorShown=="all" || colorShown=="lid") magneticLidBody();
	lidInlays(magnetic=true);
}

module round_box(l=40,w=30,h=30,bt=2,wt=2,r=5,
				 ledges="none",ledgeWidth=30,
				 ledgeProjection=6,ledgeThickness=3,ledgeTopOffset=8,
				 stackable=false,stackDepth=3,stackClearance=0.25,
				 divisionsX=0,divisionsY=0,divisionHeight=25,divisionThickness=1.2,
				 sizesX=[],sizesY=[],clearance=0.5,facets=30){
	stackEnabled=stackable;
	baseHeight=stackEnabled ? stackDepth : 0;
	baseInset=wt+stackClearance;
	floorHeight=bt+baseHeight;
	assert(wt>0 && l>2*wt && w>2*wt,
		   "Box length and width must exceed twice the positive wall thickness.");
	assert(bt>0 && h>bt,"Box height must exceed the positive bottom thickness.");
	assert(r>wt && 2*r<=min(l,w),
		   "Corner radius must exceed wall thickness and fit within the box.");
	if (stackEnabled){
		assert(stackDepth>0 && floorHeight<h,
			   "Stacking depth must be positive and leave room above the raised floor.");
		assert(h-stackDepth>=floorHeight+clearance,
			   "The stacked base must clear the lower box floor by internalClearance.");
		assert(stackClearance>0,"Stacking clearance must be positive.");
		assert(l>2*baseInset && w>2*baseInset && r>baseInset,
			   "The inset stacking base must fit within the box and its corner radius.");
		if (ledges!="none")
			assert(ledgeTopOffset>=stackDepth+clearance,
				   "Pull top offset must clear the stacked base: stackingDepth + internalClearance.");
	}
	union(){
		difference(){
			union(){
				translate([0,0,baseHeight])
				round_cube(l=l,w=w,h=h-baseHeight,r=r,$fn=facets);
				if (stackEnabled)
					// Overlap the solid base with the floor above the seating shoulder.
					translate([baseInset,baseInset,0])
					round_cube(l=l-2*baseInset,w=w-2*baseInset,
							   h=baseHeight+min(0.01,bt/2),r=r-baseInset,$fn=facets);
			}
			translate ([wt, wt, floorHeight])
			round_cube(l=l-2*wt,w=w-2*wt,h=h,r=r-wt,$fn=facets);
		}
		internalPullLedges(l=l,w=w,h=h,bt=floorHeight,wt=wt,r=r,placement=ledges,
						   width=ledgeWidth,projection=ledgeProjection,
						   thickness=ledgeThickness,topOffset=ledgeTopOffset,
						   clearance=clearance);
		internalDivisions(l=l,w=w,bt=bt,wt=wt,r=r,floorHeight=floorHeight,
						  topLimit=stackEnabled ? h-stackDepth-clearance : h,
						  countX=divisionsX,countY=divisionsY,
						  height=divisionHeight,thickness=divisionThickness,
						  sizesX=sizesX,sizesY=sizesY,facets=facets);
	}
}

function sizeSum(sizes,count)=
	count==0 ? 0 : sizes[count-1]+sizeSum(sizes,count-1);

// Positions are the near faces of walls, measured from the inner X/Y wall.
function dividerPositions(span,count,thickness,sizes,axis)=
	assert(is_num(count) && count>=0 && count==floor(count),
		   str("dividerCount",axis," must be a nonnegative integer."))
	assert(is_list(sizes),str("compartmentSizes",axis," must be a list."))
	assert(len(sizes)<=count,
		   str("compartmentSizes",axis," must contain at most ",count," clear sizes."))
	assert(len([for (size=sizes) if (!is_num(size) || size<=0) 1])==0,
		   str("compartmentSizes",axis," must contain positive numbers."))
	assert(count==0 || (is_num(thickness) && thickness>0),
		   "dividerThickness must be positive when divisions are enabled.")
	count==0 ? [] :
	let(clearSpace=span-count*thickness,
		suppliedSpace=sizeSum(sizes,len(sizes)))
	assert(clearSpace>0,str("Divider thickness leaves no compartment space along ",axis,"."))
	assert(suppliedSpace<clearSpace,
		   str("compartmentSizes",axis," plus divider thicknesses must leave positive space for remaining compartments."))
	let(remainingSize=(clearSpace-suppliedSpace)/(count+1-len(sizes)))
	[for (i=[0:count-1])
		(i<len(sizes) ? sizeSum(sizes,i+1) :
		 suppliedSpace+(i+1-len(sizes))*remainingSize)+i*thickness];

module internalDivisions(l,w,bt,wt,r,floorHeight,topLimit,
						 countX,countY,height,thickness,sizesX,sizesY,facets=30){
	xPositions=dividerPositions(l-2*wt,countX,thickness,sizesX,"X");
	yPositions=dividerPositions(w-2*wt,countY,thickness,sizesY,"Y");
	if (len(xPositions)+len(yPositions)>0){
		assert(is_num(height) && height>0,
			   "dividerHeight must be positive when divisions are enabled.");
		assert(floorHeight+height<=topLimit,
			   str("dividerHeight must not exceed ",topLimit-floorHeight,
				   " mm above the interior floor; leave clearance for the lid or stacked base."));
		overlap=min(0.05,bt/4);
		translate([0,0,floorHeight-overlap])
		intersection(){
			// Clip spanning walls to the rounded outline and fuse them into the floor/shell.
			round_cube(l=l,w=w,h=height+overlap,r=r,$fn=facets);
			union(){
				for (x=xPositions)
					translate([wt+x,0,0])
					cube([thickness,w,height+overlap]);
				for (y=yPositions)
					translate([0,wt+y,0])
					cube([l,thickness,height+overlap]);
			}
		}
	}
}

module internalPullLedges(l,w,h,bt,wt,r,
						 placement,width,projection,thickness,topOffset,clearance){
	assert(placement=="none" || placement=="start" ||
		   placement=="end" || placement=="both",
		   "pullLedges must be none, start, end, or both.");
	if (placement!="none"){
		overlap=min(0.05,wt/4);
		assert(width>0 && projection>0 && thickness>0 && topOffset>0,
			   "Pull width, projection, thickness, and top offset must be positive.");
		assert(width<=w-2*r,"Pull width must fit between the rounded end-wall corners.");
		assert((placement=="both" ? 2 : 1)*projection<l-2*wt,
			   "Pull projection leaves no space between the ledge and the opposite side.");
		assert(h-topOffset-thickness-projection-overlap>=bt+clearance,
			   "Pull ledge underside must remain above the floor by internalClearance.");
		if (placement=="start" || placement=="both")
			translate([wt,w/2,h-topOffset])
			pullLedge(width,projection,thickness,overlap);
		if (placement=="end" || placement=="both")
			translate([l-wt,w/2,h-topOffset])
			mirror([1,0,0])
			pullLedge(width,projection,thickness,overlap);
	}
}

module pullLedge(width,projection,thickness,overlap){
	rounding=min(1,width/4,(projection+overlap)/4);
	totalHeight=thickness+projection+overlap;
	intersection(){
		// A 45-degree underside grows from the wall into the finger ledge.
		translate([0,width/2,0])
		rotate([90,0,0])
		linear_extrude(height=width,convexity=4)
		polygon(points=[[-overlap,0],[projection,0],
						[projection,-thickness],[-overlap,-totalHeight]]);
		translate([-overlap,-width/2,-totalHeight])
		round_cube(l=projection+overlap,w=width,h=totalHeight+0.01,
				   r=rounding,$fn=32);
	}
}

module round_cube(l=40,w=30,h=20,r=5,$fn=30){
	hull(){
		translate ([r, r, 0]) cylinder (h = h, r=r);
		translate ([r, w-r, 0]) cylinder (h = h, r=r);
		translate ([l-r,w-r, 0]) cylinder (h = h, r=r);
		translate ([l-r, r, 0]) cylinder (h = h, r=r);
	}
}
