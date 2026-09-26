const moment = require('moment');
const prisma = require('../libs/prisma');
const { listRolesPermission } = require('../helper/roles-permission');
const { KINDS, POST_TARGETS, getPendingRows, employeeName, inboxAccessForRole } = require('../libs/approval/inbox');

const showApprovalInbox = async (req, res) => {
    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    // Role dari DB untuk cek akses inbox + jenjang tab
    const role = await prisma.roles.findFirst({ where: { uuid: userInfo.roleUuid }, select: { id: true } });
    const access = role
        ? await inboxAccessForRole(role.id)
        : { hasInboxRead: false, roleStages: [], legacyStages: [], tabs: [] };

    // { kindKey: Set(stage) } — union jenjang dari nama role + permission legacy
    const stageUnion = [...new Set([...access.roleStages, ...access.legacyStages])];
    const tabs = {};
    for (const kind of KINDS) {
        if (!access.tabs.includes(kind.key)) continue;
        const stages = kind.stages.filter((s) => stageUnion.includes(s));
        if (stages.length > 0) tabs[kind.key] = new Set(stages);
    }

    const activeTab = (req.query.tab && KINDS.some((k) => k.key === req.query.tab) && tabs[req.query.tab]) ? req.query.tab : null;
    const tabsData = [];

    for (const kind of KINDS) {
        if (!tabs[kind.key] || tabs[kind.key].size === 0) continue;
        const stages = kind.stages.filter((s) => tabs[kind.key].has(s)); // urutan = KINDS.stages
        const postTarget = POST_TARGETS[kind.key];
        const stageBlocks = [];
        for (const stage of stages) {
            const rows = await getPendingRows(kind.key, stage, 50, userInfo.id);
            stageBlocks.push({
                stage,
                postAction: postTarget[stage],
                rows: rows.map((r) => {
                    const emp = employeeName(r, kind.key);
                    const empId = r.fullName && r.fullName.employeeId ? r.fullName.employeeId
                        : r.employeDetail ? r.employeDetail.employeeId
                        : r.employeeInfo ? r.employeeInfo.employeeId : null;
                    const userId = r.fullName && r.fullName.id ? r.fullName.id
                        : r.employeDetail ? r.employeDetail.id
                        : r.employeeInfo ? r.employeeInfo.id : null;
                    const isMed = kind.key === 'medreimb';
                    return Object.assign({
                        uuid: r.uuid,
                        employeeName: emp || '-',
                        employeeId: empId ? String(empId) : '',
                        userId: userId || null,
                        workDate: !isMed && r.startDuration ? moment(r.startDuration).format('DD-MM-YYYY') : '',
                        approvedDate: isMed ? moment().format('DD-MM-YYYY') : '',
                        totalApproved: isMed ? String(r.totalReimbursement) : '',
                        daysInput: !isMed ? String(r.days ?? '') : '',
                    }, kind.detail(r));
                }),
            });
        }
        tabsData.push({ key: kind.key, label: kind.label, stages: stageBlocks });
    }

    res.render('pages/approval-inbox/index', {
        user: userInfo,
        getRoles,
        pageTitle: 'My Approvals',
        tabsData,
        hasInboxAccess: access.hasInboxRead,
        activeTab: activeTab || (tabsData.length > 0 ? tabsData[0].key : null),
        moment,
    });
}

module.exports = {
    showApprovalInbox,
}
