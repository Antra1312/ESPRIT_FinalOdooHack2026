const { getPrismaClient } = require('../config/prisma');

function getModel(modelName) {
  return getPrismaClient()[modelName];
}

class BaseService {
  constructor(modelName) {
    this.modelName = modelName;
  }

  get model() {
    return getModel(this.modelName);
  }

  async create(data) {
    return this.model.create({ data });
  }

  async findById(id, include = {}) {
    return this.model.findUnique({
      where: { id },
      include,
    });
  }

  async findMany(params = {}) {
    const { where, include, orderBy, skip, take, cursor } = params;
    return this.model.findMany({
      where,
      include,
      orderBy,
      skip,
      take,
      cursor,
    });
  }

  async findFirst(params = {}) {
    const { where, include, orderBy } = params;
    return this.model.findFirst({
      where,
      include,
      orderBy,
    });
  }

  async update(id, data) {
    return this.model.update({
      where: { id },
      data,
    });
  }

  async delete(id) {
    return this.model.delete({
      where: { id },
    });
  }

  async count(where = {}) {
    return this.model.count({ where });
  }

  async exists(where) {
    const record = await this.model.findFirst({ where });
    return !!record;
  }

  async paginate(params = {}) {
    const { page = 1, limit = 20, where, include, orderBy } = params;
    const skip = (page - 1) * limit;
    const take = limit;

    const [data, total] = await Promise.all([
      this.model.findMany({ where, include, orderBy, skip, take }),
      this.model.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }
}

module.exports = BaseService;