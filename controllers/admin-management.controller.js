var logger = require('../libs/logger'),
    csrf = require('../libs/csrf'),
    csrfProtection = csrf({
      cookie: true
    });

const prisma = require('../libs/prisma');

const moment = require('moment');
const { listRolesPermission } = require('../helper/roles-permission');
const roleIdEmployee = 1;

const listAdminManagement = async (req, res) => {
    const query = req.query;
    let search = query.search;
    where = {};
    if (search) {
        where = { AND: [ 
                    {
                        fullName: {
                            contains: search,
                        },
                    },
                    { NOT: 
                        { roleId: roleIdEmployee, }
                    
                    }
                ]
            }
        
    } else {
        where = {     
            NOT: {
                roleId: roleIdEmployee,
            }                  
        }
    }

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    const totalCount = await prisma.users.count({
        where
    });

    const totalPage = Math.ceil(totalCount / limit);
    let totalRecordCurrentPage = limit;
    if (page == (totalPage - 1) || totalPage == 1) {
        totalRecordCurrentPage = totalCount % limit;
        if(totalRecordCurrentPage == 0)
            totalRecordCurrentPage = limit;
    }
    const currentPage = page || 0;

    const getDataAdminManagement = await prisma.users.findMany({
        skip,
        take: limit,
        where,
        select: {
            id: true,
            uuid: true,
            employeeId: true,
            status: true,
            role: {
                select: {
                  id: true,
                  roleName: true,
                },
            },
            assignDate: true,
            fullName: true,
            joinDate: true,
            email: true,
            mobilePhone: true,
            dob: true,
            placeOfBirth: true,
            personalIdType: true,
            personalIdNumber: true,
            address: true,
            employmentStatus: true,
            businessUnit: {
                select: {
                  id: true,
                  businessUnitName: true,
                },
            },
            division: {
                select: {
                  id: true,
                  divisionName: true,
                },
            },
            jobTitle: {
                select: {
                  id: true,
                  jobTitleName: true,
                },
            },
            basicSalary: true,
            npwp: true,
        },
        orderBy: {
            assignDate: 'desc',
        }
    });
    const listOfRoles = await prisma.roles.findMany({
        where: {
            NOT: {
                id : roleIdEmployee,
            },
        },
        select: {
            id: true,
            roleName: true,
        },
    });
    const metaDataAdminManagement = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount, totalRecordCurrentPage: totalRecordCurrentPage};
    const listOflistAdminManagement = { meta : metaDataAdminManagement, data: getDataAdminManagement};

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    let param = { user: userInfo, getRoles, search, pageTitle: 'Admin Management', listOflistAdminManagement: listOflistAdminManagement, listOfRoles: listOfRoles, moment: moment };
    res.render('pages/admin-management/index', param);
}

const searchAdminManagement = async (req, res) => {
    const query = req.query;
    let search = query.search;
    where = {};
    if (search) {
        where = { AND: [ 
                    {
                        fullName: {
                            contains: search,
                        },
                    },
                    { roleId: roleIdEmployee, }
                ]
            }
        
    } else {
        where = {     
            roleId: roleIdEmployee,
        }
    }

    const page = parseInt(query.page) || 0;
    const limit = parseInt(query.limit) || 10;
    const skip = page * limit;

    const totalCount = await prisma.users.count({
        where,
    });

    const totalPage = Math.ceil(totalCount / limit);
    const currentPage = page || 0;

    const getDataAdminManagement = await prisma.users.findMany({
        skip: skip,
        take: limit,
        where,
        select: {
            id: true,
            uuid: true,
            employeeId: true,
            status: true,
            role: {
                select: {
                  id: true,
                  roleName: true,
                },
            },
            assignDate: true,
            fullName: true,
            joinDate: true,
            email: true,
            mobilePhone: true,
            dob: true,
            placeOfBirth: true,
            personalIdType: true,
            personalIdNumber: true,
            address: true,
            employmentStatus: true,
            businessUnit: {
                select: {
                  id: true,
                  businessUnitName: true,
                },
            },
            division: {
                select: {
                  id: true,
                  divisionName: true,
                },
            },
            jobTitle: {
                select: {
                  id: true,
                  jobTitleName: true,
                },
            },
            basicSalary: true,
            npwp: true,
        }
    });
    const metaDataAdminManagement = { limit: limit, currentPage: currentPage, totalPage: totalPage, totalRecords: totalCount};
    const listOflistAdminManagement = { meta : metaDataAdminManagement, data: getDataAdminManagement};

    const listOfRoles = await prisma.roles.findMany({
        where: {
            NOT: {
                id : roleIdEmployee,
            },
        },
        select: {
            id: true,
            roleName: true,
        },
    });

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    let param = { user: userInfo, getRoles, search, pageTitle: 'Admin Management', listOflistAdminManagement: listOflistAdminManagement, listOfRoles: listOfRoles };
    res.render('pages/admin-management/assign', param);
}

const addAdminManagement = async (req, res) => {
    const listOflistAdminManagement = await prisma.users.findMany({
        where: {
            NOT: {
                roleId: roleIdEmployee,
            }
        },
        select: {
            id: true,
            uuid: true,
            employeeId: true,
            status: true,
            role: {
                select: {
                  id: true,
                  roleName: true,
                },
            },
            assignDate: true,
            fullName: true,
            joinDate: true,
            email: true,
            mobilePhone: true,
            dob: true,
            placeOfBirth: true,
            personalIdType: true,
            personalIdNumber: true,
            address: true,
            employmentStatus: true,
            businessUnit: {
                select: {
                  id: true,
                  businessUnitName: true,
                },
            },
            division: {
                select: {
                  id: true,
                  divisionName: true,
                },
            },
            jobTitle: {
                select: {
                  id: true,
                  jobTitleName: true,
                },
            },
            basicSalary: true,
            npwp: true,
        }
    });
    const listOfRoles = await prisma.roles.findMany({
        where: {
            NOT: {
                id : roleIdEmployee,
            },
        },
        select: {
            id: true,
            roleName: true,
        },
    });
    
    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    let param = { user: userInfo, getRoles, pageTitle: 'Admin Management', listOflistAdminManagement: listOflistAdminManagement, listOfRoles: listOfRoles };
    res.render('pages/admin-management/index', param);
}

const getEmployeeDetail = async (req, res) => {
    const uuid = req.params.uuid;
    const dataEmployee = await prisma.users.findUnique({
        where: {
            uuid: uuid,
        },
        select: {
            id: true,
            uuid: true,
            employeeId: true,
            status: true,
            role: {
                select: {
                  id: true,
                  roleName: true,
                },
            },
            fullName: true,
            joinDate: true,
            email: true,
            mobilePhone: true,
            dob: true,
            placeOfBirth: true,
            personalIdType: true,
            personalIdNumber: true,
            address: true,
            employmentStatus: true,
            businessUnit: {
                select: {
                  id: true,
                  businessUnitName: true,
                },
            },
            division: {
                select: {
                  id: true,
                  divisionName: true,
                },
            },
            jobTitle: {
                select: {
                  id: true,
                  jobTitleName: true,
                },
            },
            basicSalary: true,
            npwp: true,
        }
    });

    const stringifyDataEmployee = JSON.stringify(dataEmployee, (key, value) =>
        typeof value === "bigint" ? value.toString() : value
    );

    res.status(200).send({
        status: true,
        statusCode: 200,
        message: 'Get data detail successfully',
        data: stringifyDataEmployee
    });
}

const assignAdmin = async (req, res) => {
    const { employee_id, role, role_name, employee_uuid, assign_date } = req.body;
    const createdBy = req.user.fullName;
    const updatedBy = req.user.fullName;

    let roleId = Number(role);
    const insertDataAssign = await prisma.adminManagement.create({
        data: {
            employeeId: Number(employee_id),
            role: role_name,
            assignDate: moment(assign_date).toDate(),
            createdBy: createdBy,
            updatedBy: updatedBy
        }
    })

    const updateData = await prisma.users.update({
        where : {
            uuid: employee_uuid
        },
        data: {
            roleId: roleId,
            assignDate: moment(assign_date).toDate(),
            updatedBy: updatedBy
        }
    })

    if (insertDataAssign){
        res.redirect('back');
    }
}

const removeAdmin = async (req, res) => {
    const uuid = req.body.employee_uuid;

    const removeData = await prisma.users.update({
        where : {
            uuid: uuid
        },
        data: {
            roleId: roleIdEmployee,
            assignDate: null,
        }
    })
    res.redirect('back');
}

module.exports = {
    listAdminManagement,
    searchAdminManagement,
    addAdminManagement,
    assignAdmin,
    removeAdmin,
    getEmployeeDetail,
}
