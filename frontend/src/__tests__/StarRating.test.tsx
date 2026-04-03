/**
 * Pruebas unitarias — StarRating.tsx
 */

import { render, screen, fireEvent } from '@testing-library/react';
import StarRating from '../components/StarRating';

describe('StarRating — renderizado', () => {
    it('renderiza 5 estrellas siempre', () => {
        const { container } = render(<StarRating value={3} />);
        const svgs = container.querySelectorAll('svg');
        expect(svgs).toHaveLength(5);
    });

    it('las estrellas hasta el valor están rellenas con color dorado', () => {
        const { container } = render(<StarRating value={3} />);
        const svgs = Array.from(container.querySelectorAll('svg'));
        const rellenas = svgs.filter((s) => s.getAttribute('fill') === '#f5a623');
        expect(rellenas).toHaveLength(3);
    });

    it('las estrellas después del valor están vacías', () => {
        const { container } = render(<StarRating value={3} />);
        const svgs = Array.from(container.querySelectorAll('svg'));
        const vacias = svgs.filter((s) => s.getAttribute('fill') !== '#f5a623');
        expect(vacias).toHaveLength(2);
    });

    it('con value=1 solo la primera estrella está rellena', () => {
        const { container } = render(<StarRating value={1} />);
        const svgs = Array.from(container.querySelectorAll('svg'));
        expect(svgs[0].getAttribute('fill')).toBe('#f5a623');
        expect(svgs[1].getAttribute('fill')).not.toBe('#f5a623');
    });

    it('con value=5 todas las estrellas están rellenas', () => {
        const { container } = render(<StarRating value={5} />);
        const svgs = Array.from(container.querySelectorAll('svg'));
        const rellenas = svgs.filter((s) => s.getAttribute('fill') === '#f5a623');
        expect(rellenas).toHaveLength(5);
    });

    it('con value=0 ninguna estrella está rellena', () => {
        const { container } = render(<StarRating value={0} />);
        const svgs = Array.from(container.querySelectorAll('svg'));
        const rellenas = svgs.filter((s) => s.getAttribute('fill') === '#f5a623');
        expect(rellenas).toHaveLength(0);
    });
});

describe('StarRating — modo interactivo', () => {
    it('llama onChange con el valor correcto al hacer click en la tercera estrella', () => {
        const onChange = jest.fn();
        const { container } = render(<StarRating value={0} onChange={onChange} />);
        const svgs = container.querySelectorAll('svg');
        fireEvent.click(svgs[2]); // estrella 3
        expect(onChange).toHaveBeenCalledWith(3);
    });

    it('llama onChange con 1 al hacer click en la primera estrella', () => {
        const onChange = jest.fn();
        const { container } = render(<StarRating value={0} onChange={onChange} />);
        const svgs = container.querySelectorAll('svg');
        fireEvent.click(svgs[0]);
        expect(onChange).toHaveBeenCalledWith(1);
    });

    it('llama onChange con 5 al hacer click en la última estrella', () => {
        const onChange = jest.fn();
        const { container } = render(<StarRating value={0} onChange={onChange} />);
        const svgs = container.querySelectorAll('svg');
        fireEvent.click(svgs[4]);
        expect(onChange).toHaveBeenCalledWith(5);
    });

    it('muestra hover al pasar el mouse sobre una estrella', () => {
        const { container } = render(<StarRating value={1} onChange={jest.fn()} />);
        const svgs = container.querySelectorAll('svg');
        // Al hacer hover en la estrella 4, las primeras 4 deben mostrarse doradas
        fireEvent.mouseEnter(svgs[3]); // estrella 4 (índice 3)
        const rellenas = Array.from(container.querySelectorAll('svg')).filter(
            (s) => s.getAttribute('fill') === '#f5a623'
        );
        expect(rellenas).toHaveLength(4);
    });

    it('restaura el valor original al salir del contenedor', () => {
        const { container } = render(<StarRating value={2} onChange={jest.fn()} />);
        const svgs = container.querySelectorAll('svg');
        const div = container.querySelector('div')!;

        fireEvent.mouseEnter(svgs[4]); // hover en 5
        fireEvent.mouseLeave(div);     // salir del div

        const rellenas = Array.from(container.querySelectorAll('svg')).filter(
            (s) => s.getAttribute('fill') === '#f5a623'
        );
        expect(rellenas).toHaveLength(2); // vuelve al value=2
    });
});

describe('StarRating — modo readonly', () => {
    it('no llama onChange al hacer click en modo readonly', () => {
        const onChange = jest.fn();
        const { container } = render(<StarRating value={3} onChange={onChange} readonly />);
        const svgs = container.querySelectorAll('svg');
        fireEvent.click(svgs[0]);
        expect(onChange).not.toHaveBeenCalled();
    });

    it('no cambia las estrellas al hacer hover en modo readonly', () => {
        const { container } = render(<StarRating value={2} readonly />);
        const svgs = container.querySelectorAll('svg');

        fireEvent.mouseEnter(svgs[4]); // hover en estrella 5
        const rellenas = Array.from(container.querySelectorAll('svg')).filter(
            (s) => s.getAttribute('fill') === '#f5a623'
        );
        // Debe seguir mostrando solo 2 estrellas (value=2, sin hover effect)
        expect(rellenas).toHaveLength(2);
    });

    it('usa cursor default en modo readonly', () => {
        const { container } = render(<StarRating value={3} readonly />);
        const div = container.querySelector('div')!;
        expect(div.style.cursor).toBe('default');
    });

    it('usa cursor pointer en modo interactivo', () => {
        const { container } = render(<StarRating value={3} onChange={jest.fn()} />);
        const div = container.querySelector('div')!;
        expect(div.style.cursor).toBe('pointer');
    });
});
