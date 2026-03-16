/* eslint-disable */
import React, {useState, useEffect} from 'react';
import 'lazysizes';
import css from '../css/thumbnails.module.css';

export default function Preview({images, selectedImage, onThumbnailClick}) {
  const [activeIndex, setactiveIndex] = useState(0);

  useEffect(() => {
    setactiveIndex(selectedImage);
  }, [selectedImage]);

  useEffect(() => {
    setactiveIndex(activeIndex);
  }, []);

  function handleThumbnailClick(e) {
    const node = e.target;
    if (node.classList.contains(css.thumbnail)) {
      const index = Number(node.dataset.index);
      setactiveIndex(index);
      if (onThumbnailClick) {
        onThumbnailClick(index);
      }
    }
  }

  return (
    <div className={css.thumbnails} onClick={handleThumbnailClick}>
      {images.map((obj, index) => {
        const active = index === activeIndex;
        return (
          <div
            key={obj.input}
            data-index={index}
            className={`${css.thumbnail} ${active ? css.active : ''}`}
          >
            <img className="lazyload" data-src={`${obj.input}?w=100`} alt="" />
          </div>
        );
      })}
    </div>
  );
}
