export function animateModal(node, { delay = 100, easing = cubicOut, duration = 400, start = 0, end = 1, x1 = 0, y1 = 0, x2 = 100, y2 = 100 }) {
	node.style.left = `${x2}px`;
	node.style.top = `${y2}px`;

	const sd = end - start;
	const dx = x2 - x1;
	const dy = y2 - y1;

	return {
			delay,
			duration,
			easing,
			css: (t, u) => {
				return `
					transform: scale(${end - (sd * u)});				
					left: ${x1 + (dx * t)}px;	
					top: ${y1 + (dy * t)}px;						
				`;
	}};
}