'use client'
import React from 'react'
import Link from 'next/link'

import { Category } from '../../../../payload/payload-types'
import { useFilter } from '../../../_providers/Filter'

import classes from './index.module.scss'

type CategoryCardProps = {
  category: Category
}

const CategoryCard = ({ category }: CategoryCardProps) => {
  const media = typeof category.media === 'object' ? category.media : null
  const { setCategoryFilters } = useFilter()

  return (
    <Link
      href="/products"
      className={classes.card}
      style={{ backgroundImage: media?.url ? `url(${media.url})` : undefined }}
      onClick={() => setCategoryFilters([category.id])}
    >
      <p className={classes.title}>{category.title}</p>
    </Link>
  )
}

export default CategoryCard
