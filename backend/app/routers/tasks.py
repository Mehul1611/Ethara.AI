import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_project_admin, require_project_member
from app.models import MemberRole, ProjectMember, Task, User
from app.schemas import TaskOut, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _get_task_in_project(db: Session, task_id: uuid.UUID) -> Task | None:
    return db.get(Task, task_id)


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(
    task_id: uuid.UUID,
    body: TaskUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Task:
    task = _get_task_in_project(db, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    membership = require_project_member(db, task.project_id, user)
    data = body.model_dump(exclude_unset=True)

    if membership.role == MemberRole.member:
        if task.assignee_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Can only update tasks assigned to you")
        if "assignee_id" in data:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot reassign tasks")
        allowed = {"status"}
        data = {k: v for k, v in data.items() if k in allowed}
    else:
        if "assignee_id" in data and data["assignee_id"] is not None:
            mem = db.execute(
                select(ProjectMember).where(
                    ProjectMember.project_id == task.project_id,
                    ProjectMember.user_id == data["assignee_id"],
                )
            ).scalar_one_or_none()
            if not mem:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assignee must be a project member")

    for key, value in data.items():
        setattr(task, key, value)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    task = _get_task_in_project(db, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    require_project_admin(db, task.project_id, user)
    db.delete(task)
    db.commit()
