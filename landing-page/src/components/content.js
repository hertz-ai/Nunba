/* eslint-disable */
import React from 'react';
import DOMPurify from 'dompurify';
import remark from 'remark';
import recommended from 'remark-preset-lint-recommended';
import remarkHtml from 'remark-html';

import css from '../css/content.module.css';

const Content = ({md}) => {
  const content = remark()
    .use(recommended)
    .use(remarkHtml)
    .processSync(md)
    .toString();

  return (
    <div
      className={css.content}
      dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(content)}}
    />
  );
};

export default Content;
