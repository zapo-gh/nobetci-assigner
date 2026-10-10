import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import Icon from '../components/Icon';
import AbsenteeList from '../components/AbsenteeList';

describe('Icon component', () => {
  it('renders trash, edit, search, chevronUp, chevronDown, map, save', () => {
    const { container: trashContainer } = render(<Icon name="trash" size={16} />);
    expect(trashContainer.querySelector('svg')).toBeTruthy();

    const { container: editContainer } = render(<Icon name="edit" size={16} />);
    expect(editContainer.querySelector('svg')).toBeTruthy();

    const { container: searchContainer } = render(<Icon name="search" size={16} />);
    expect(searchContainer.querySelector('svg')).toBeTruthy();

    const { container: chevronUpContainer } = render(<Icon name="chevronUp" size={16} />);
    expect(chevronUpContainer.querySelector('svg')).toBeTruthy();

    const { container: chevronDownContainer } = render(<Icon name="chevronDown" size={16} />);
    expect(chevronDownContainer.querySelector('svg')).toBeTruthy();

    const { container: mapContainer } = render(<Icon name="map" size={16} />);
    expect(mapContainer.querySelector('svg')).toBeTruthy();

    const { container: saveContainer } = render(<Icon name="save" size={16} />);
    expect(saveContainer.querySelector('svg')).toBeTruthy();
  });
});

describe('AbsenteeList IMES handling and delete button icon', () => {
  it('does not count IMES lessons as affected school classes needing duty substitution', () => {
    const absentPeople = [
      {
        absentId: 'abs-1',
        name: 'Ahmet Yılmaz',
        days: ['Mon'],
        timeSlot: 'full',
        reason: 'Raporlu'
      }
    ];

    const teacherSchedules = {
      'Ahmet Yılmaz': {
        monday: {
          8: 'AMP İMES',
          9: 'AMP İMES',
          10: 'AMP İMES'
        }
      }
    };

    const { container } = render(
      <AbsenteeList
        absentPeople={absentPeople}
        onDelete={() => {}}
        IconComponent={Icon}
        teacherSchedules={teacherSchedules}
        classLocations={{}}
      />
    );

    // Should render the card
    expect(screen.getByText('Ahmet Yılmaz')).toBeInTheDocument();

    // Since all lessons are İMES (out of school), "Dersleri Gör (X)" button should NOT exist or count should be 0
    expect(screen.queryByText(/Dersleri Gör/)).not.toBeInTheDocument();

    // The delete button must contain an SVG icon
    const deleteBtn = container.querySelector('button[aria-label="Mazereti Sil"]');
    expect(deleteBtn).toBeTruthy();
    expect(deleteBtn?.querySelector('svg')).toBeTruthy();

    // The capsules for 8, 9, 10 must have (Okul Dışı) note and not be in affected red state
    expect(screen.getAllByText('(Okul Dışı)').length).toBe(3);
  });
});
