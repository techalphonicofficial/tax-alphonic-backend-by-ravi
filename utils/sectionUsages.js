const { Op } = require('sequelize');
const { Page, Blog, Service, ServiceSection, ServiceSectionData, sequelize } = require('../models');

// Every page, service and blog whose Page Builder sections reference the given id
// (a formId or packageId stored inside a block payload)
const findSectionUsages = async (id) => {
  const like = `%${id}%`;
  const castLike = (column) => sequelize.where(sequelize.cast(sequelize.col(column), 'CHAR'), { [Op.like]: like });

  const [pages, sectionData, blogs] = await Promise.all([
    Page.findAll({ where: castLike('Page.sections'), attributes: ['id', 'title', 'slug'] }),
    ServiceSectionData.findAll({
      where: castLike('ServiceSectionData.payload'),
      attributes: ['id'],
      include: [{
        model: ServiceSection,
        as: 'section',
        attributes: ['id'],
        include: [{ model: Service, as: 'service', attributes: ['id', 'title', 'slug'] }]
      }]
    }),
    Blog.findAll({ where: { content: { [Op.like]: like } }, attributes: ['id', 'title', 'slug'] })
  ]);

  const services = new Map();
  sectionData.forEach(d => {
    const svc = d.section?.service;
    if (svc) services.set(svc.id, { type: 'service', id: svc.id, title: svc.title, slug: svc.slug });
  });

  return [
    ...pages.map(p => ({ type: 'page', id: p.id, title: p.title, slug: p.slug })),
    ...services.values(),
    ...blogs.map(b => ({ type: 'blog', id: b.id, title: b.title, slug: b.slug }))
  ];
};

module.exports = { findSectionUsages };
