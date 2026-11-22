import React from 'react';
import { CategoryCount, CrimeCategoryType } from '../types/crime';
import { CategoryCard } from './CategoryCard';
import { CategoryGridSkeleton } from './LoadingSkeleton';

interface CategoryGridProps {
  categories: CategoryCount[];
  selectedCategory: CrimeCategoryType;
  onSelectCategory: (category: CrimeCategoryType) => void;
  loading: boolean;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  loading,
}) => {
  if (loading && categories.length === 0) {
    return <CategoryGridSkeleton />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {categories.map((item) => (
        <CategoryCard
          key={item.category}
          category={item.category}
          count={item.count}
          selected={item.category === selectedCategory}
          onClick={() => onSelectCategory(item.category)}
        />
      ))}
    </div>
  );
};
